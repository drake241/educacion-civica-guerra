# Configuración Supabase (paso 1)

## 1. Crear proyecto

1. Entrá a [supabase.com](https://supabase.com) → **New project** (plan gratis).
2. Anotá **Project URL** y **anon public** key (Settings → API).

## 2. Ejecutar SQL

En **SQL Editor**, pegá y ejecutá **en orden**:

1. [`migrations/001_initial.sql`](migrations/001_initial.sql)
2. [`migrations/002_teacher_rounds.sql`](migrations/002_teacher_rounds.sql)

Si `alter publication supabase_realtime add table` falla porque ya existen, ignorá ese error o activá Realtime en **Database → Replication** para tablas `rooms` y `players`.

## 3. Config del juego

```bash
cp js/config.example.js js/config.js
```

Editá `js/config.js` con tu URL y anon key.

`config.js` está en `.gitignore` — no subas la key a repos públicos si preferís; la **anon key** con RLS es el patrón habitual de Supabase en frontend.

## 4. Probar RPC

En SQL Editor:

```sql
select public.create_room();
```

Debe devolver `room_id` y `code`.

## Funciones usadas por el juego

| RPC | Quién |
|-----|--------|
| `create_room()` | Proyector |
| `join_room(code, nickname, country)` | Celular |
| `submit_vote(player_id, kind, option_id?)` | Celular |
| `teacher_start_war(room_id, pin)` | Proyector |
| `teacher_set_subphase(room_id, pin, subphase)` | Proyector |
| `teacher_close_vote(...)` | Proyector |
| `teacher_apply_consequence(...)` | Proyector |
| `teacher_next_round(room_id, pin)` | Proyector |
| `teacher_set_ending(room_id, pin, ending)` | Proyector |

Pin docente: **4125** (solo aula; ver comentario `ponytail` en SQL).
