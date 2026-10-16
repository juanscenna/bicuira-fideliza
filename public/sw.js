// Service worker do cartão: recebe as notificações do restaurante (web push).

// versão nova assume na hora (sem esperar o usuário fechar todas as abas)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));
self.addEventListener("push", (evento) => {
  let aviso = {};
  try {
    aviso = evento.data ? evento.data.json() : {};
  } catch {
    aviso = { corpo: evento.data ? evento.data.text() : "" };
  }
  evento.waitUntil(
    self.registration.showNotification(aviso.titulo || "Cartão fidelidade", {
      body: aviso.corpo || "",
      icon: aviso.icone || undefined,
      // ícone pequeno da barra: precisa ser silhueta (o Android pinta de uma cor só)
      badge: aviso.badge || undefined,
      data: { url: aviso.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = (evento.notification.data && evento.notification.data.url) || "/";
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) if (j.url.includes(url) && "focus" in j) return j.focus();
      return self.clients.openWindow(url);
    }),
  );
});
