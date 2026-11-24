const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

// firebase related var
const admin = require("firebase-admin");
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

require("dotenv").config();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cors());

const serviceAccount = require("./firebase-adminsdk.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

initializeApp({
  credential: cert(serviceAccount),
});

const uri = process.env.URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middlewares

const veriryFirebaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({
        success: false,
        message: "Unauthorized access for not having authorization",
      });
  }
  const token = authorization.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .send({
        success: false,
        message: "Unauthorized access for not having token",
      });
  }

  try {
    // const decoded = await admin.auth().verifyIdToken(token)
    const decodedByAuth = await getAuth().verifyIdToken(token);
    req.decoded_email = decodedByAuth.email;
    console.log({ decodedByAuth });
    next();
  } catch (error) {
    res
      .status(401)
      .send({ success: false, message: "Your token is not valid" });
    console.log(error);
  }
};

app.get("/", (req, res) => {
  res.send("Medicine app is running");
});

async function start() {
  try {
    await client.connect();
    // Send a ping to confirm a successful connection
    const result = await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );

    const db = client.db("ChanuaCareDB");
    const medicineCollection = db.collection("medicine");
    const usersCollection = db.collection("users");

    // Medicine apis
    app.post("/medicine", async (req, res) => {
      console.log(
        "Authorization Headers in post=> /medicine : ",
        req.headers.authorization,
      );
      const data = req.body;
      const result = await medicineCollection.insertOne(data);
      res.json(result);
    });

    app.get("/medicine", async (req, res) => {
      const { search, sort } = req.query;
   
      const query = {};
      const sortBy = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      if (sort) {
        sortBy.price = sort === "asc" ? 1 : -1;
      }

      const collection = medicineCollection.find(query).sort(sortBy);
      const medicines = await collection.toArray();
      return res.json(medicines);
    });

    // users apis
    app.post("/users", async (req, res) => {
      const user = req.body;
      const isExist = await usersCollection.findOne({ email: user.email });
      if (isExist) {
        return res.json({ success: false, message: "User already exist" });
      }
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    app.get("/users", async (req, res) => {
      const collection = usersCollection.find();
      const users = await collection.toArray();
      res.send(users);
    });

    // not found route
    app.use((req, res) => {
      res.status(404).send("This Route is not created, please try another");
    });
  } catch (error) {
    console.log(error);
  } finally {
  }
}

start().catch(console.dir);

app.listen(PORT, () => {
  console.log(`Medicin app is running on port ${PORT}`);
});
