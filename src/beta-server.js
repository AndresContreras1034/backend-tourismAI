import "dotenv/config";
import app from "./beta-app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[BETA API] Tourism AI disponible en el puerto ${PORT}`);
});
