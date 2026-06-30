"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cuenta, Perfil, Servicio } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Search, User, MessageSquare, Bell } from "lucide-react";
import { deleteAccount } from "@/lib/actions/accounts";
import { getProfiles, updateProfile, deleteProfile, getAllProfiles } from "@/lib/actions/profiles";
import { getClient } from "@/lib/actions/clients";
import { getService, getServices } from "@/lib/actions/services";
import { toast } from "sonner";
import { format, isValid, differenceInDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AccountTableProps {
  accounts: Cuenta[];
  onAccountDeleted: () => void;
}

export function AccountTable({ accounts, onAccountDeleted }: AccountTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<{[key: string]: Perfil[]}>({});
  const [services, setServices] = useState<{[key: string]: Servicio}>({});
  const [selectedProfile, setSelectedProfile] = useState<Perfil | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Cuenta | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<string>("1");

  const loadAllProfiles = async () => {
    const profilesData: {[key: string]: Perfil[]} = {};
    const servicesData: {[key: string]: Servicio} = {};
    
    try {
      const [allProfiles, allServices] = await Promise.all([
        getAllProfiles(),
        getServices()
      ]);
      
      allServices.forEach((service) => {
        servicesData[service.id] = service;
      });
      
      accounts.forEach((account) => {
        profilesData[account.id] = allProfiles.filter((p) => p.cuentaId === account.id);
      });
      
      setProfiles(profilesData);
      setServices(servicesData);
    } catch (error) {
      console.error("Error loading data in loadAllProfiles:", error);
    }
  };

  useEffect(() => {
    loadAllProfiles();
  }, [accounts]);

  const handleWhatsAppMessage = async () => {
    if (!selectedProfile || !selectedAccount) return;

    try {
      const client = await getClient(selectedProfile.clienteId);
      
      if (!client || !client.telefono) {
        toast.error("No se encontró el número de teléfono del cliente");
        return;
      }

      const message = `🚀GT Tecnology🚀\n
Buen día estimad@ ${selectedProfile.nombreCliente}, ¡Felicitaciones! Tu suscripción mensual de ${selectedAccount.nombreServicio} 🍿 te brindará entretenimiento ilimitado y satisfacción absoluta. \n ¡Eres importante para nosotros!, cualquier novedad escríbenos. ✍️
✅ CORREO: ${selectedAccount.cuenta}
✅ CONTRASEÑA: ${selectedAccount.passwordCuenta}
Perfil: ${selectedProfile.nombrePerfil}
Pin: ${selectedProfile.pin || 'No asignado'}
INDICACIONES PARA EL USUARIO 🙋‍♀️
=============================
* NO debe cambiar el nombre de otros perfiles.
* NO usar mas de 1 dispositivos contratados.
Fecha Activación: ${format(selectedProfile.fechaInicio, "dd/MM/yyyy", { locale: es })}
🚀GT Tecnology🚀`;

      const encodedMessage = encodeURIComponent(message);
      const phoneNumber = client.telefono.replace(/\D/g, '');
      const formattedPhone = phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;
      const whatsappNumber = `593${formattedPhone}`;
      window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
    } catch (error) {
      console.error('Error getting client data:', error);
      toast.error("Error al obtener los datos del cliente");
    }
  };

  const handleNotifyExpiration = async () => {
    if (!selectedProfile || !selectedAccount) return;

    try {
      const client = await getClient(selectedProfile.clienteId);
      
      if (!client || !client.telefono) {
        toast.error("No se encontró el número de teléfono del cliente");
        return;
      }

      const message = `¡Hola *${selectedProfile.nombreCliente}* \n ! Le recordamos que la suscripción a *${selectedAccount.nombreServicio}* con GT Tecnology vence el ${format(selectedProfile.fechaFin || new Date(), "dd/MM/yyyy", { locale: es })}. 
Renueva ahora y sigue accediendo a un mundo de entretenimiento sin límites. \n *GT Tecnology* `;

      const encodedMessage = encodeURIComponent(message);
      const phoneNumber = client.telefono.replace(/\D/g, '');
      const formattedPhone = phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;
      const whatsappNumber = `593${formattedPhone}`;
      window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
    } catch (error) {
      console.error('Error getting client data:', error);
      toast.error("Error al obtener los datos del cliente");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setLoading(true);
      await deleteAccount(deleteId);
      toast.success("Cuenta eliminada exitosamente");
      onAccountDeleted();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error("Error al eliminar la cuenta");
    } finally {
      setLoading(false);
      setDeleteId(null);
    }
  };

  const getProfileIconColor = (profile: Perfil | null) => {
    if (!profile) return "text-gray-300"; // Perfil libre

    if (!profile.fechaInicio || !profile.fechaFin) return "text-gray-300";

    const today = new Date();
    const daysUntilExpiration = differenceInDays(profile.fechaFin, today);

    if (daysUntilExpiration < 0) return "text-red-500"; // Vencido
    if (daysUntilExpiration <= 3) return "text-orange-500"; // Por vencer
    return "text-green-500"; // Activo
  };

  const handleProfileClick = (account: Cuenta, profile: Perfil | null) => {
    if (profile) {
      setSelectedProfile(profile);
      setSelectedAccount(account);
      setShowProfileDialog(true);
    } else {
      router.push(`/dashboard/cuentas/${account.id}/perfiles/nuevo`);
    }
  };

  const handleProfileDelete = async () => {
    if (!selectedProfile || !selectedAccount) return;

    try {
      setLoading(true);
      await deleteProfile(selectedProfile.id);
      
      const updatedProfiles = {
        ...profiles,
        [selectedAccount.id]: profiles[selectedAccount.id].filter(
          p => p.id !== selectedProfile.id
        )
      };
      setProfiles(updatedProfiles);
      
      toast.success("Perfil eliminado exitosamente");
      setShowProfileDialog(false);
      onAccountDeleted();
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast.error("Error al eliminar el perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileRenew = async () => {
    if (!selectedProfile || !selectedAccount) return;

    try {
      setLoading(true);
      const months = parseInt(selectedDuration);
      
      // Calculate new dates based on current end date
      const currentEndDate = selectedProfile.fechaFin || new Date();
      const newStartDate = new Date(currentEndDate);
      const newEndDate = addDays(newStartDate, months * 30); // 30 days per month

      const updatedProfile = {
        ...selectedProfile,
        fechaInicio: newStartDate,
        fechaFin: newEndDate,
        estado: 'activo'
      };

      await updateProfile(selectedProfile.id, updatedProfile);

      const updatedProfiles = {
        ...profiles,
        [selectedAccount.id]: profiles[selectedAccount.id].map(p =>
          p.id === selectedProfile.id ? updatedProfile : p
        )
      };
      setProfiles(updatedProfiles);

      toast.success(`Perfil renovado por ${months * 30} días exitosamente`);
      setShowProfileDialog(false);
    } catch (error) {
      console.error('Error renewing profile:', error);
      toast.error("Error al renovar el perfil");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    if (!isValid(dateObj)) return "";
    return format(dateObj, "dd/MM/yyyy", { locale: es });
  };

  const renderProfileIcons = (account: Cuenta) => {
    const accountProfiles = profiles[account.id] || [];
    const service = services[account.servicioId];
    const totalProfiles = service?.numeroperfiles || 0;

    return Array.from({ length: totalProfiles }).map((_, index) => {
      const profile = accountProfiles[index];
      const iconColor = getProfileIconColor(profile);

      return (
        <HoverCard key={index}>
          <HoverCardTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="p-0"
              onClick={() => handleProfileClick(account, profile)}
            >
              <User className={`h-5 w-5 ${iconColor}`} />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            {profile ? (
              <div className="space-y-2">
                <p className="font-medium">{profile.nombrePerfil}</p>
                <p>Cliente: {profile.nombreCliente}</p>
                <p>Estado: {profile.estado}</p>
                <p>Inicio: {formatDate(profile.fechaInicio)}</p>
                <p>
                  Fin: {formatDate(profile.fechaFin)}
                  {profile.fechaFin && differenceInDays(profile.fechaFin, new Date()) <= 3 && (
                    <span className="ml-2 text-orange-500 font-medium">
                      (Por vencer)
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Click para asignar perfil
              </p>
            )}
          </HoverCardContent>
        </HoverCard>
      );
    });
  };

  const filteredAccounts = accounts.filter((account) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      account.cuenta.toLowerCase().includes(searchTermLower) ||
      account.nombreServicio.toLowerCase().includes(searchTermLower)
    );
  });

  return (
    <>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cuentas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Fecha Facturación</TableHead>
                <TableHead>Perfiles</TableHead>
                <TableHead>Observación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {searchTerm ? "No se encontraron cuentas" : "No hay cuentas registradas"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.cuenta}</TableCell>
                    <TableCell>{account.nombreServicio}</TableCell>
                    <TableCell>{formatDate(account.fechaFacturacion)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        {renderProfileIcons(account)}
                      </div>
                    </TableCell>
                    <TableCell>{account.observacion}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push(`/dashboard/cuentas/${account.id}/editar`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteId(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del Perfil</DialogTitle>
          </DialogHeader>
          {selectedProfile && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <p><strong>Cliente:</strong> {selectedProfile.nombreCliente}</p>
                <p><strong>Perfil:</strong> {selectedProfile.nombrePerfil}</p>
                <p><strong>Estado:</strong> {selectedProfile.estado}</p>
                <p><strong>Fecha Inicio:</strong> {formatDate(selectedProfile.fechaInicio)}</p>
                <p>
                  <strong>Fecha Fin:</strong> {formatDate(selectedProfile.fechaFin)}
                  {selectedProfile.fechaFin && differenceInDays(selectedProfile.fechaFin, new Date()) <= 3 && (
                    <span className="ml-2 text-orange-500 font-medium">
                      (Por vencer)
                    </span>
                  )}
                </p>
                {selectedProfile.pin && <p><strong>PIN:</strong> {selectedProfile.pin}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Duración de la renovación:</label>
                <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar duración" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mes (30 días)</SelectItem>
                    <SelectItem value="2">2 meses (60 días)</SelectItem>
                    <SelectItem value="3">3 meses (90 días)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between space-x-2">
            <div className="flex space-x-2">
              <Button
                variant="destructive"
                onClick={handleProfileDelete}
                disabled={loading}
              >
                Eliminar
              </Button>
              <Button
                variant="outline"
                onClick={handleWhatsAppMessage}
                disabled={loading}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={handleNotifyExpiration}
                disabled={loading}
              >
                <Bell className="h-4 w-4 mr-2" />
                Notificar
              </Button>
            </div>
            <Button
              onClick={handleProfileRenew}
              disabled={loading}
            >
              {loading ? "Renovando..." : "Renovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La cuenta será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}