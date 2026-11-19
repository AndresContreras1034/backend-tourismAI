# EstoTourism AI Backend

## Beta pública sin cuentas

La beta se inicia con `npm run start:beta`. Este servidor publica únicamente
los endpoints Expo de itinerario y ClaudIA; no conecta a la base de datos ni
monta registro, inicio de sesión, perfiles o MFA. Para el servidor beta solo se
requieren `DEEPSEEK_API_KEY` y, opcionalmente, `DEEPSEEK_MODEL`.

El servicio ML está en `ml-service/` y utiliza el dataset incluido para entrenar
el recomendador al arrancar. `render.yaml` declara ambos servicios para Render.
Configura `VITE_API_URL` con la URL del backend y `VITE_AI_SERVICE_URL` con la
URL ML en las variables de entorno de Vercel; no subas claves al repositorio.

## Planificador Expo y ClaudIA

`GET /ai/expo-weather` actualiza el pronóstico de mañana sin regenerar el
itinerario ni llamar a DeepSeek. Open-Meteo se consulta con un reintento ante
errores transitorios; los fallos se guardan en caché por 10 segundos para
permitir una nueva consulta pronto.

`POST /ai/expo-plan` crea un itinerario de un día para una experiencia elegida
entre las tres recomendaciones ML. DeepSeek recibe el tipo de viaje, la categoría
de presupuesto, la compañía y las fichas locales pertinentes. El backend consulta
el pronóstico de mañana de Bogotá en Open-Meteo y lo incluye en las
recomendaciones; si se prevé lluvia, pide adaptar las actividades. Si el servicio
del clima no está disponible, la respuesta lo indica en vez de inventar un
pronóstico. También calcula un índice heurístico de horarios, presupuesto, clima
y distancia geográfica; no es una puntuación en tiempo real.

`POST /ai/expo-chat` conecta a ClaudIA con DeepSeek y le proporciona el plan y
el pronóstico como contexto. Acepta una foto JPEG, PNG, GIF o WebP de hasta 5 MB
en memoria para analizarla con DeepSeek; no la guarda en disco ni en la base de
datos. La clave permanece en el backend; no la incluyas en el frontend, en
commits ni en mensajes.

Configura `DEEPSEEK_API_KEY` y `DEEPSEEK_MODEL=deepseek-flash` en el entorno del
servidor o en un `.env` local ignorado por Git. El modelo Flash se usa con el
razonamiento desactivado para priorizar rapidez. No pegues la clave en el chat.
Reinicia `npm run dev` después de editar la configuración. El frontend Expo debe
tener `VITE_API_URL` apuntando a este backend.

```powershell
npm run dev
```

Los endpoints validan sus entradas y limitan las solicitudes por IP. DeepSeek
recibe un reintento acotado ante errores temporales del proveedor y una
corrección del formato si el plan generado no cumple el contrato. Las
coordenadas se resuelven desde OpenStreetMap Nominatim o un catálogo local
aproximado; las consultas Nominatim se serializan para respetar su límite de
frecuencia. Los parqueaderos se consultan en OpenStreetMap Overpass y pueden
estar incompletos. El mapa Leaflet muestra líneas rectas entre paradas, no rutas
reales de calles ni transporte. Los precios son estimaciones; confirma rutas,
operación, acceso y tarifas antes del viaje.
