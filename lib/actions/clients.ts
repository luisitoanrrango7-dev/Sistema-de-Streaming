import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Cliente } from '@/types';
import { getCachedData, setCachedData, invalidateCache } from "@/lib/cache-helper";

export async function getClients(): Promise<Cliente[]> {
  const cacheKey = "clients";
  const cached = getCachedData<Cliente[]>(cacheKey);
  if (cached) return cached;

  try {
    const clientesRef = collection(db, 'clientes');
    const q = query(clientesRef, orderBy('fechaRegistro', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const result = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        nombre: data.nombre || '',
        email: data.email || '',
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        fechaRegistro: data.fechaRegistro?.toDate() || new Date(),
      };
    });

    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
}

export async function getClientCount(): Promise<number> {
  const cacheKey = "clients_count";
  const cached = getCachedData<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const clientesRef = collection(db, 'clientes');
    const snapshot = await getDocs(clientesRef);
    const result = snapshot.size;
    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error getting client count:', error);
    return 0;
  }
}

export async function getClient(id: string): Promise<Cliente | null> {
  try {
    const docRef = doc(db, 'clientes', id);
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
      fechaRegistro: data.fechaRegistro?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error fetching client:', error);
    throw error;
  }
}

export async function createClient(data: Omit<Cliente, 'id' | 'fechaRegistro'>) {
  try {
    const docRef = await addDoc(collection(db, 'clientes'), {
      ...data,
      fechaRegistro: Timestamp.now(),
    });
    invalidateCache(["clients", "clients_count"]);
    return docRef;
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
}

export async function updateClient(id: string, data: Partial<Omit<Cliente, 'id' | 'fechaRegistro'>>) {
  try {
    const docRef = doc(db, 'clientes', id);
    await updateDoc(docRef, data);
    invalidateCache(["clients", "clients_count"]);
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
}

export async function deleteClient(id: string) {
  try {
    const docRef = doc(db, 'clientes', id);
    await deleteDoc(docRef);
    invalidateCache(["clients", "clients_count"]);
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
}