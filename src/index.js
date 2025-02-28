import "dotenv/config";
import connectDB from "./db/dbConn.js";
import app from "./app.js";

(async () => {
  try {
    // you gotta make sure your database is connected first then the server start listening to request
    await connectDB();
    app.listen(process.env.PORT, () => {
      console.log(`server started listening on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
})();

export default app;
