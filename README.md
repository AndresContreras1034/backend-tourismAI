# EstoTourism AI Backend

## Planificador Expo y ClaudIA

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

Configura `DEEPSEEK_API_KEY` y `DEEPSEEK_MODEL=deepseek-flash` en un `.env` local
ignorado por Git. El modelo Flash se usa con el razonamiento desactivado para
priorizar rapidez. No pegues la clave en el chat. Reinicia `npm run dev` después
de editar la configuración. El frontend Expo debe tener `VITE_API_URL`
apuntando a este backend.

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
