// This outbox shares the demo transaction. An institutional sender is deliberately
// not configured in the public presentation environment.
export function enqueueWorkflowNotifications(state, request, at) {
  state.outbox ||= [];
  for (const item of request.items) {
    const events = [];
    if (item.assigneeId) {
      const user = state.users.find((entry) =>
        entry.accounts?.some(
          (account) => account.executorId === item.assigneeId,
        ),
      );
      if (user)
        events.push({ type: "MISION_ASIGNADA", recipientUserId: user.id });
    }
    if (item.status === "CERRADA")
      events.push({
        type: "MISION_FINALIZADA",
        recipientUserId: request.ownerUserId,
      });
    if (request.area === "VICTIMAS" && item.status === "DEVUELTA")
      events.push({
        type: `SOLICITUD_DEVUELTA_V${item.submissionVersion || 1}`,
        recipientUserId: request.ownerUserId,
      });
    for (const event of events) {
      const key = `${event.type}:${item.id}:${event.recipientUserId}`;
      if (state.outbox.some((entry) => entry.key === key)) continue;
      state.outbox.push({
        id: `AVISO-${state.outbox.length + 1}`,
        key,
        ...event,
        area: request.area,
        requestId: request.id,
        itemId: item.id,
        createdAt: at,
        status: "PENDIENTE_CONFIGURACION",
        attempts: 0,
        // No facts, victim data, documents or tokens in mail payloads.
      });
    }
  }
}

// The provider must honor idempotencyKey. Never call this worker without an
// explicitly configured institutional provider; the Space only records notices.
export async function dispatchOutbox({
  repository,
  sender,
  clock = () => new Date().toISOString(),
  leaseMilliseconds = 60000,
}) {
  if (!sender) return;
  repository.transaction((state) => {
    const now = clock();
    for (const entry of state.outbox || [])
      if (
        entry.status === "EN_PROCESO" &&
        (!entry.leaseUntil || entry.leaseUntil <= now)
      ) {
        entry.status = "FALLIDA";
        entry.failureCode = "WORKER_LEASE_EXPIRED";
      }
  });
  const entries = repository.snapshot().outbox || [];
  for (const candidate of entries.filter(
    (entry) =>
      ["PENDIENTE", "FALLIDA"].includes(entry.status) &&
      (!entry.nextAttemptAt || entry.nextAttemptAt <= clock()),
  )) {
    const claimed = repository.transaction((state) => {
      const entry = state.outbox.find((row) => row.key === candidate.key);
      if (!["PENDIENTE", "FALLIDA"].includes(entry.status)) return false;
      entry.status = "EN_PROCESO";
      entry.attempts++;
      entry.leaseUntil = new Date(
        Date.parse(clock()) + leaseMilliseconds,
      ).toISOString();
      return true;
    });
    if (!claimed) continue;
    try {
      const result = await sender.send({
        type: candidate.type,
        recipientUserId: candidate.recipientUserId,
        requestId: candidate.requestId,
        itemId: candidate.itemId,
        idempotencyKey: candidate.key,
      });
      repository.transaction((state) => {
        Object.assign(
          state.outbox.find((entry) => entry.key === candidate.key),
          {
            status: "ENVIADA",
            sentAt: clock(),
            providerId: result?.id || null,
            leaseUntil: null,
          },
        );
      });
    } catch {
      repository.transaction((state) => {
        Object.assign(
          state.outbox.find((entry) => entry.key === candidate.key),
          {
            status: "FALLIDA",
            failedAt: clock(),
            failureCode: "MAIL_PROVIDER_FAILURE",
            leaseUntil: null,
            nextAttemptAt: new Date(
              Date.parse(clock()) +
                Math.min(
                  3600000,
                  1000 * 2 ** Math.min(candidate.attempts || 0, 12),
                ),
            ).toISOString(),
          },
        );
      });
    }
  }
}
