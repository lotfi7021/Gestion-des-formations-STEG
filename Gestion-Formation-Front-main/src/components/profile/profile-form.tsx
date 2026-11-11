import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Save, User as UserIcon } from "lucide-react";
import { updateProfile, type User } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/errors";
import { profileSchema, type ProfileData } from "@/lib/validations";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ProfileFormProps = {
  user: User;
  roleLabel: string;
  onUpdated: (values: ProfileData) => void;
};

export function ProfileForm({ user, roleLabel, onUpdated }: ProfileFormProps) {
  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user.username,
      nom: user.nom ?? "",
      prenom: user.prenom ?? "",
      telephone: user.telephone ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ProfileData) =>
      updateProfile({
        username: values.username,
        nom: values.nom || undefined,
        prenom: values.prenom || undefined,
        telephone: values.telephone || undefined,
      }),
    onSuccess: (_data, values) => {
      onUpdated(values);
      form.reset(values);
    },
    onError: (error) => form.setError("root", { message: getErrorMessage(error) }),
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <UserIcon className="h-5 w-5 text-primary" />
        <h2 className="font-display text-2xl">Informations du compte</h2>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder="ex : Martin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prenom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom</FormLabel>
                  <FormControl>
                    <Input placeholder="ex : Sophie" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom d'utilisateur</FormLabel>
                <FormControl>
                  <Input placeholder={user.username || "ex : jean.dupont"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="telephone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Téléphone</FormLabel>
                <FormControl>
                  <Input placeholder="+216XXXXXXXX" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <FormLabel>Email</FormLabel>
            <Input value={user.email} disabled className="mt-2 opacity-60" />
            <p className="mt-1 text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
          </div>
          <div>
            <FormLabel>Rôle</FormLabel>
            <Input value={roleLabel} disabled className="mt-2 opacity-60" />
          </div>

          {form.formState.errors.root && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}
          {mutation.isSuccess && <p className="text-sm text-primary">Profil mis à jour</p>}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </form>
      </Form>
    </section>
  );
}
