const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cors());

const uri = process.env.URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Medicin app is running");
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

    app.post("/medicine", async (req, res) => {
      const data = req.body;
      const result = await medicineCollection.insertOne(data);
      res.json(result);
    });

    app.get("/medicine", async (req, res) => {
      const { search, sort } = req.query;
      console.log({search, sort})

      const query = {};
      const sortBy = {}
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      if(sort){
        sortBy.price = sort === 'asc' ? 1 : -1
      }

      const collection = medicineCollection.find(query).sort(sortBy);
      const medicines = await collection.toArray();
      return res.json(medicines);
    });

    // not found route
    app.use((req, res) => {
      res.status(404).send("This Route is not created, please try another");
    });
  } catch (error) {
    console.log(error);
  } finally {
    // await client.close();
  }
}

start().catch(console.dir);

app.listen(PORT, () => {
  console.log(`Medicin app is running on port ${PORT}`);
});
