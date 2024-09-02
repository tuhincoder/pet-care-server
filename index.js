const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express()
const port = process.env.PORT || 5000;



// middle ware 
app.use(cors())
app.use(express.json())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tpqoiya.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const petCategoryCollection = client.db('petCare').collection('category')
        const allPetCollection = client.db('petCare').collection('allPets')
        const petFoodCollection = client.db('petCare').collection('petFood')
        const campaignCollection = client.db('petCare').collection('campaigns')
        const userCollection = client.db('petCare').collection('users')
        const userAdoptionCollection = client.db('petCare').collection('adoption')
        const cartsCollection = client.db('petCare').collection('cart')
        // dashboard
        const petAddedCollection = client.db('petCare').collection('petAdded')
        const createDonaCampCollection = client.db('petCare').collection('createDonCamp')
        const galleryCollection = client.db('petCare').collection('gallery')
        const teamCollection = client.db('petCare').collection('team')

        // jwt related api

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            // console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' })
            res.send({ token })
        })
        // verify the token
        const verifyToken = (req, res, next) => {
            // console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1]

            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }

                req.user = decoded;
                next()
            })
        }

        // check the admin 
        const verifyAdmin = async (req, res, next) => {
            const email = req.user.email;
            const query = { email: email }
            const user = await userCollection.findOne(query)
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }


        // user related  api here
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })



        // get the admin
        app.get('/user/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let isAdmin = false;
            if (user) {
                isAdmin = user.role === 'admin';
            }
            res.send({ isAdmin })
        })
        // ---------------------------------------
        app.post('/user', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'user all ready exists' })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        app.patch('/user/makAdmin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })


        app.delete('/users-cancel/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })

        // pet 4 Category related api
        app.get('/api/v1/pets-category', async (req, res) => {
            const result = await petCategoryCollection.find().toArray()
            res.send(result)
        })



        // all pets related api (total pets 16 )
        app.get('/api/v1/allPets-read', async (req, res) => {
            const filter = req.query;
            console.log(filter);
            const query = {
                name: { $regex: filter.search, $options: 'i' }
            }
            // if (filter) {
            //     query.filter = { $regex: filter.search, $options: 'i' }
            // }
            const result = await allPetCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/api/v1/allPet-read/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await allPetCollection.findOne(query)
            res.send(result)
        })

        // donation campaigns api
        app.get('/api/v1/campaigns-read', async (req, res) => {
            const result = await campaignCollection.find().toArray()
            res.send(result)
        })

        app.get('/api/v1/campaigns-read/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await campaignCollection.findOne(query)
            res.send(result)
        })


        // petFood related api
        app.get('/api/v1/petFood-read', async (req, res) => {
            const result = await petFoodCollection.find().toArray()
            res.send(result)
        })

        app.get('/api/v1/petFood-read/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await petFoodCollection.findOne(query)
            res.send(result)
        })

        // pet food store data base (Cart related api)
        app.get('/api/v1/carts', async (req, res) => {
            const email = req.query.email;
            // console.log(req.headers);
            const query = { email }
            const result = await cartsCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/api/v1/carts', async (req, res) => {

            const item = req.body;
            const result = await cartsCollection.insertOne(item)
            res.send(result)
        })

        app.delete('/api/v1/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query)
            res.send(result)
        })
        // -----------  dashboard data api   ----------------
        // user dashboard api

        app.get('/api/v1/pedAdded-read', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await petAddedCollection.find(query).toArray()
            res.send(result)

        })
        app.get('/api/v1/pedAdded-read/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await petAddedCollection.findOne(query)
            res.send(result)
        })
        app.post('/api/v1/pedAdded-create', async (req, res) => {
            const petIem = req.body;
            const result = await petAddedCollection.insertOne(petIem)
            res.send(result)
        })
        //  my added pet
        app.patch('/api/v1/myAddedPet-update/:id', async (req, res) => {
            const petItem = req.body;
            const id = req.params.id;
            console.log(petItem);
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    ...petItem
                }
            }
            const result = await petAddedCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        app.patch('/pet-adopted/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }

            const updateDoc = {
                $set: {
                    role: 'adopted'
                }
            }
            const result = await petAddedCollection.updateOne(filter, updateDoc)
            res.send(result)
        })


        app.delete('/api/v1/pedAdded-cancel/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await petAddedCollection.deleteOne(query)
            res.send(result)
        })

        // user adoption api
        app.get('/api/v1/userAdoption', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await userAdoptionCollection.find(query).toArray()
            res.send(result)
        })
        app.post('/api/v1/userAdoption', async (req, res) => {
            const adoption = req.body;
            const result = await userAdoptionCollection.insertOne(adoption)
            res.send(result)
        })



        // create donation campaign
        app.get('/api/v1/myDonation-Campaign', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await createDonaCampCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/api/v1/createDonation-campaign', async (req, res) => {
            const donation = req.body;
            const result = await createDonaCampCollection.insertOne(donation)
            res.send(result)

        })

        app.delete('/api/v1/myDonationCamp/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await createDonaCampCollection.deleteOne(query)
            res.send(result)
        })
        // stats dashboard for user and admin
        app.get('/user-stats', async (req, res) => {
            const user = await userCollection.estimatedDocumentCount()
            const petListing = await allPetCollection.estimatedDocumentCount()
            const petFood = await petFoodCollection.estimatedDocumentCount()
            const addToCart = await cartsCollection.estimatedDocumentCount()
            const allDonation = await userAdoptionCollection.estimatedDocumentCount()
            res.send({
                user,
                petListing,
                petFood,
                addToCart,
                allDonation,

            })
        })


        // admin dashboard
        //  get all user added pet only admin see
        app.get('/api/v1/pedAdded-read', verifyToken, verifyAdmin, async (req, res) => {
            const result = await petAddedCollection.find().toArray()
            res.send(result)
        })

        app.delete('/api/v1/pedAdded-cancel/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await petAddedCollection.deleteOne(query)
            res.send(result)
        })

        // user adoption 
        app.get('/api/v1/donation-campaign', verifyToken, verifyAdmin, async (req, res) => {
            const result = await createDonaCampCollection.find().toArray()
            res.send(result)
        })
        app.delete('/api/v1/donation-campaign/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await createDonaCampCollection.deleteOne(query)
            res.send(result)
        })
        // --------------------------
        app.get('/gallery', async (req, res) => {
            const result = await galleryCollection.find().toArray()
            res.send(result)
        })
        // team member
        app.get('/temMember', async (req, res) => {
            const result = await teamCollection.find().toArray()
            res.send(result)
        })





        app.get('/admin-stats', async (req, res) => {
            const user = await userCollection.estimatedDocumentCount()
            const totalCart = await cartsCollection.estimatedDocumentCount()
            const adoption = await userAdoptionCollection.estimatedDocumentCount()
            const allPet = await allPetCollection.estimatedDocumentCount()
            res.send({
                user,
                totalCart,
                adoption,
                allPet



            })
        })
        // payment 
        // app.post('/create-payment-intent', async (req, res) => {
        //     const { price } = req.body;
        //     const amount = parseInt(price * 100)

        //     const paymentIntent = await stripe.paymentIntents.create({
        //         amount: amount,
        //         currency: 'usd',
        //         payment_method_types: ['card']
        //     })
        //     res.send({
        //         clientSecret: paymentIntent.client_secret,
        //     })
        // })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);






app.get('/', (req, res) => {
    res.send('pet care is running!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})