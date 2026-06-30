import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Proveedor } from '@/types';
import { getCachedData, setCachedData, invalidateCache } from "@/lib/cache-helper";

export async function getProviders(): Promise<Proveedor[]> {
  const cacheKey = "providers";
  const cached = getCachedData<Proveedor[]>(cacheKey);
  if (cached) return cached;

  try {
    const proveedoresRef = collection(db, 'proveedores');
    const q = query(proveedoresRef, orderBy('fechaRegistro', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const result = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        nombre: data.nombre || '',
        email: data.email || '',
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        estado: data.estado || '',
        servicio: data.servicio || '',
        fechaRegistro: data.fechaRegistro?.toDate() || new Date(),
      };
    });

    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching providers:', error);
    throw error;
  }
}

export async function getProvider(id: string): Promise<Proveedor | null> {
  try {
    const docRef = doc(db, 'proveedores', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      nombre: data.nombre || '',
      email: data.email || '',
      telefono: data.telefono || '',
      direccion: data.direccion || '',
      estado: data.estado || '',
      servicio: data.servicio || '',
      fechaRegistro: data.fechaRegistro?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error fetching provider:', error);
    throw error;
  }
}

export async function createProvider(data: Omit<Proveedor, 'id' | 'fechaRegistro'>) {
  try {
    const docRef = await addDoc(collection(db, 'proveedores'), {
      ...data,
      fechaRegistro: Timestamp.now(),
    });
    invalidateCache("providers");
    return docRef;
  } catch (error) {
    console.error('Error creating provider:', error);
    throw error;
  }
}

export async function updateProvider(id: string, data: Partial<Omit<Proveedor, 'id' | 'fechaRegistro'>>) {
  try {
    const docRef = doc(db, 'proveedores', id);
    await updateDoc(docRef, data);
    invalidateCache("providers");
  } catch (error) {
    console.error('Error updating provider:', error);
    throw error;
  }
}

export async function deleteProvider(id: string) {
  try {
    const docRef = doc(db, 'proveedores', id);
    await deleteDoc(docRef);
    invalidateCache("providers");
  } catch (error) {
    console.error('Error deleting provider:', error);
    throw error;
  }
}