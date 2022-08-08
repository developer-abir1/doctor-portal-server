const express = require('express');
const cors = require("cors")
const app = express();
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 4500;
const { MongoClient, ServerApiVersion, Admin } = require('mongodb');
require("dotenv").config()


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.km2nwyl.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



function verifyjwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader)
    {
        return res.status(401).send({ message: "Unauthorization access" })

    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRE, function (err, decoded) {
        if (err)
        {
            return res.status(403).send({ message: "Forbedden Access" })
        }
        req.decoded = decoded;
        next()
    })

}


async function run() {
    try
    {
        await client.connect()
        const serviceCollaction = client.db("doctors-potal").collection("services")
        const bookingsCollaction = client.db("doctors-potal").collection("bookings")
        const usersCollaction = client.db("doctors-potal").collection("users")

        app.get("/services", async (req, res) => {
            const query = {}
            const cursor = serviceCollaction.find(query);
            const services = await cursor.toArray()
            res.send(services)

        })

        // booking services 

        app.post("/booking", async (req, res) => {
            const booking = req.body;
            const quary = { treatment: booking.treatment, date: booking.date, parent: booking.parent }
            const exists = await bookingsCollaction.findOne(quary);
            if (exists)
            {
                return res.send({ success: false, booking: exists })
            }
            const result = await bookingsCollaction.insertOne(booking)
            return res.send({ success: true, result })
        })

        // // get booking 
        app.get("/booking", verifyjwt, async (req, res) => {
            const patient = req.query.patient;
            // const authorization = req.headers.authorization;
            const decodedEmail = req.decoded.email
            if (patient === decodedEmail)
            {
                const quary = { patient: patient };
                const booking = await bookingsCollaction.find(quary).toArray()
                return res.send(booking)
            }
            else
            {
                return res.status(403).send({ message: "Forbidden Access" })
            }


        })





        app.get("/available", async (req, res) => {
            const date = req.query.date;


            // step: 1  get all service
            const services = await serviceCollaction.find().toArray();
            const quary = { date: date };

            // step :  booking services 
            const booking = await bookingsCollaction.find(quary).toArray()
            //  step 3 how to get slots item in booking for each


            services.forEach(service => {
                const serviceBooking = booking.filter(b => b.treatment === service.name);


                const booked = serviceBooking.map(s => s.slot);

                const available = service.slots.filter(slot => !booked.includes(slot));
                service.slots = available
            })


            res.send(services)
        })



        app.put("/user/admin/:email", verifyjwt, async (req, res) => {
            const email = req.params.email;

            const requster = req.decoded.email;
            const requserAccount = await usersCollaction.findOne({ email: requster })
            if (requserAccount.role === 'admin')
            {

                const filter = { email: email }

                const updateDoc = {
                    $set: { role: "admin" }
                }

                const result = await usersCollaction.updateOne(filter, updateDoc)


                res.send({ result })
            }
            else
            {
                res.status(403).send({ message: "forbedden" })
            }


        })
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email }
            const option = { upsert: true }
            const updateDoc = {
                $set: user
            }

            const result = await usersCollaction.updateOne(filter, updateDoc, option)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRE, { expiresIn: '1h' })

            res.send({ result, token })
        })
        app.get("/user", verifyjwt, async (req, res) => {

            const result = await usersCollaction.find().toArray();

            res.json(result)
        })
        // admin 

        app.get("/admin/:email", verifyjwt, async (req, res) => {
            const email = req.params.email;
            const user = await usersCollaction.findOne({ email: email })
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })



        console.log("Abir dabase is connected")

    }
    finally
    {

    }
}
run().catch(console.dir)


app.use(cors());
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World! I am abir khan i"m conmnmninbg hooooo')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})







