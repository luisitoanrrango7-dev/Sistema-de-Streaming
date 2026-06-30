"use client";

import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, where, Timestamp, deleteDoc, doc, updateDoc, getDoc, runTransaction } from "firebase/firestore";
import { Perfil } from "@/types";
import { getCachedData, setCachedData, invalidateCache } from "@/lib/cache-helper";

export const getProfiles = async (cuentaId: string): Promise<Perfil[]> => {
  const cacheKey = "profiles_by_account_" + cuentaId;
  const cached = getCachedData<Perfil[]>(cacheKey);
  if (cached) return cached;

  try {
    const perfilesRef = collection(db, 'perfiles');
    const q = query(perfilesRef, where("cuentaId", "==", cuentaId));
    const querySnapshot = await getDocs(q);
    
    const result = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fechaInicio: doc.data().fechaInicio?.toDate() || null,
      fechaFin: doc.data().fechaFin?.toDate() || null,
    } as Perfil));

    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
};

export const getAllProfiles = async (): Promise<Perfil[]> => {
  const cacheKey = "all_profiles";
  const cached = getCachedData<Perfil[]>(cacheKey);
  if (cached) return cached;

  try {
    const perfilesRef = collection(db, 'perfiles');
    const querySnapshot = await getDocs(perfilesRef);
    
    const result = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fechaInicio: doc.data().fechaInicio?.toDate() || null,
      fechaFin: doc.data().fechaFin?.toDate() || null,
    } as Perfil));

    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching all profiles:', error);
    return [];
  }
};

export const getAvailableProfilesCount = async (): Promise<number> => {
  const cacheKey = "available_profiles_count";
  const cached = getCachedData<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const [profiles, accounts] = await Promise.all([
      getAllProfiles(),
      getDocs(collection(db, 'cuentas'))
    ]);

    let totalProfiles = 0;
    accounts.forEach(account => {
      const service = account.data().nombreServicio.toLowerCase();
      totalProfiles += service.includes("netflix") ? 5 : 4;
    });

    const usedProfiles = profiles.length;
    const result = totalProfiles - usedProfiles;
    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error getting available profiles count:', error);
    return 0;
  }
};

export const createProfile = async (profileData: Partial<Perfil>): Promise<string> => {
  try {
    const perfilesRef = collection(db, 'perfiles');
    
    // Usar una transacción para actualizar tanto el perfil como la cuenta
    const newProfileId = await runTransaction(db, async (transaction) => {
      // Obtener la cuenta actual
      const cuentaRef = doc(db, 'cuentas', profileData.cuentaId as string);
      const cuentaDoc = await transaction.get(cuentaRef);
      
      if (!cuentaDoc.exists()) {
        throw new Error('La cuenta no existe');
      }

      const cuentaData = cuentaDoc.data();
      const perfilesOcupados = cuentaData.perfilesOcupados || 0;
      const perfilesLibres = cuentaData.perfilesLibres || 5;

      // Verificar que hay perfiles disponibles
      if (perfilesLibres <= 0) {
        throw new Error('No hay perfiles disponibles en esta cuenta');
      }

      // Actualizar los contadores de la cuenta
      transaction.update(cuentaRef, {
        perfilesOcupados: perfilesOcupados + 1,
        perfilesLibres: perfilesLibres - 1
      });

      // Crear el nuevo perfil
      const newProfileRef = doc(collection(db, 'perfiles'));
      transaction.set(newProfileRef, {
        ...profileData,
        fechaInicio: Timestamp.fromDate(profileData.fechaInicio as Date),
        fechaFin: Timestamp.fromDate(profileData.fechaFin as Date),
        fechaRegistro: Timestamp.fromDate(new Date()),
      });

      return newProfileRef.id;
    });

    invalidateCache([
      "all_profiles",
      "available_profiles_count",
      "profiles_by_account_" + profileData.cuentaId,
      "accounts",
      "accounts_count"
    ]);

    return newProfileId;
  } catch (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
};

export const updateProfile = async (profileId: string, profileData: Partial<Perfil>): Promise<void> => {
  try {
    const profileRef = doc(db, 'perfiles', profileId);
    
    // Obtener los datos del perfil antes de actualizar para saber a qué cuenta pertenece
    const profileDoc = await getDoc(profileRef);
    const originalCuentaId = profileDoc.exists() ? profileDoc.data()?.cuentaId : null;

    const updateData = {
      ...profileData,
      fechaInicio: profileData.fechaInicio ? Timestamp.fromDate(new Date(profileData.fechaInicio)) : undefined,
      fechaFin: profileData.fechaFin ? Timestamp.fromDate(new Date(profileData.fechaFin)) : undefined,
    };
    await updateDoc(profileRef, updateData);

    const cacheToInvalidate = ["all_profiles", "available_profiles_count"];
    if (originalCuentaId) {
      cacheToInvalidate.push("profiles_by_account_" + originalCuentaId);
    }
    invalidateCache(cacheToInvalidate);
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

export const deleteProfile = async (profileId: string): Promise<void> => {
  try {
    // Obtener el perfil para saber a qué cuenta pertenece
    const profileRef = doc(db, 'perfiles', profileId);
    const profileDoc = await getDoc(profileRef);
    
    if (!profileDoc.exists()) {
      throw new Error('El perfil no existe');
    }

    const profileData = profileDoc.data();
    const cuentaId = profileData.cuentaId;

    // Usar una transacción para actualizar tanto el perfil como la cuenta
    await runTransaction(db, async (transaction) => {
      // Obtener la cuenta actual
      const cuentaRef = doc(db, 'cuentas', cuentaId);
      const cuentaDoc = await transaction.get(cuentaRef);
      
      if (!cuentaDoc.exists()) {
        throw new Error('La cuenta no existe');
      }

      const cuentaData = cuentaDoc.data();
      const perfilesOcupados = cuentaData.perfilesOcupados || 0;
      const perfilesLibres = cuentaData.perfilesLibres || 0;

      // Actualizar los contadores de la cuenta
      transaction.update(cuentaRef, {
        perfilesOcupados: Math.max(0, perfilesOcupados - 1),
        perfilesLibres: Math.min(5, perfilesLibres + 1)
      });

      // Eliminar el perfil
      transaction.delete(profileRef);
    });

    invalidateCache([
      "all_profiles",
      "available_profiles_count",
      "profiles_by_account_" + cuentaId,
      "accounts",
      "accounts_count"
    ]);
  } catch (error) {
    console.error('Error deleting profile:', error);
    throw error;
  }
};