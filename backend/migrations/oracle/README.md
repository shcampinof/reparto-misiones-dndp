# Migraciones Oracle SIGIP-DP

Estas migraciones crean únicamente objetos nuevos con prefijo `SIGIP_` en un esquema dedicado. El ejecutor se niega a usar `SYS` o `SYSTEM`, valida Oracle 12.1 o superior para el modo Thin y no ejecuta DDL si `ALLOW_ORACLE_MIGRATION` no vale `true`.

No ejecute estos archivos manualmente en producción. Primero inventaríe objetos, respalde el esquema, valide los checksums y ejecute el contrato contra un esquema no productivo. Oracle confirma DDL de forma implícita; por ello una recuperación ante fallo se hace con un script compensatorio revisado por DBA, no con un `ROLLBACK` ficticio.
