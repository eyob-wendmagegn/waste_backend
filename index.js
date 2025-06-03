const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(
  cors({
    origin: "*", // Allow all origins in development
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  }),
)
app.use(express.json())

// MongoDB Connection
mongoose
  .connect("mongodb://localhost:27017/EyobDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Models
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

const collectionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  wasteType: { type: String, required: true },
  location: { type: String, required: true },
  address: { type: String, required: true },
  dateTime: { type: Date, required: true },
  kilograms: { type: Number, required: true },
  rewardPoints: { type: Number, required: true },
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
})

const centerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  acceptedWasteTypes: { type: [String], required: true },
  operatingHours: { type: String, required: true },
})

const tutorialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String, required: true },
  videoUrl: { type: String },
  steps: { type: [String], required: true },
  category: { type: String, required: true },
})

const User = mongoose.model("User", userSchema, "log")
const Collection = mongoose.model("Collection", collectionSchema, "storeCollection")
const Center = mongoose.model("Center", centerSchema, "other")
const Tutorial = mongoose.model("Tutorial", tutorialSchema, "other")

// Routes
// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
    })

    await user.save()

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Check if user exists
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" })
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" })
    }

    // Create JWT token
    const token = jwt.sign({ id: user._id }, "your_jwt_secret", { expiresIn: "1d" })

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Collection Routes
app.post("/api/collections", async (req, res) => {
  try {
    console.log("Received collection data:", req.body)

    // Validate required fields
    const { userId, userName, wasteType, location, address, dateTime, kilograms, rewardPoints } = req.body

    if (!userId || !userName || !wasteType || !location || !address || !dateTime || !kilograms) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        receivedData: req.body,
      })
    }

    // Create new collection with validated data
    const collection = new Collection({
      userId,
      userName,
      wasteType,
      location,
      address,
      dateTime: new Date(dateTime),
      kilograms: Number(kilograms),
      rewardPoints: Number(rewardPoints),
      status: "pending",
      createdAt: new Date(),
    })

    await collection.save()

    res.status(201).json({
      success: true,
      message: "Collection scheduled successfully",
      collection,
    })
  } catch (error) {
    console.error("Collection creation error:", error)
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
      stack: error.stack,
    })
  }
})

app.get("/api/collections", async (req, res) => {
  try {
    const collections = await Collection.find().sort({ createdAt: -1 })
    res.status(200).json({ success: true, collections })
  } catch (error) {
    console.error("Get collections error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

app.get("/api/collections/user/:userId", async (req, res) => {
  try {
    const collections = await Collection.find({ userId: req.params.userId }).sort({ createdAt: -1 })
    res.status(200).json({ success: true, collections })
  } catch (error) {
    console.error("Get user collections error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Center Routes
app.get("/api/centers", async (req, res) => {
  try {
    // For testing, create some sample centers if none exist
    const centersCount = await Center.countDocuments()
    if (centersCount === 0) {
      const sampleCenters = [
        {
          name: "Addis Recycling Center",
          address: "Bole Road, Addis Ababa",
          phone: "0911223344",
          latitude: 9.0222,
          longitude: 38.7468,
          acceptedWasteTypes: ["Plastic", "Paper", "Glass", "Metal"],
          operatingHours: "Mon-Fri: 8AM-5PM, Sat: 9AM-2PM",
        },
        {
          name: "Green Ethiopia Recycling",
          address: "Meskel Square, Addis Ababa",
          phone: "0922334455",
          latitude: 9.0127,
          longitude: 38.7612,
          acceptedWasteTypes: ["Plastic", "Electronic", "Metal"],
          operatingHours: "Mon-Sat: 9AM-6PM",
        },
        {
          name: "Hawassa Waste Management",
          address: "Main Street, Hawassa",
          phone: "0933445566",
          latitude: 7.0622,
          longitude: 38.4777,
          acceptedWasteTypes: ["Plastic", "Paper", "Organic"],
          operatingHours: "Mon-Fri: 8:30AM-4:30PM",
        },
      ]

      await Center.insertMany(sampleCenters)
      console.log("Sample recycling centers created")
    }

    const centers = await Center.find()
    res.status(200).json({ success: true, centers })
  } catch (error) {
    console.error("Get centers error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Tutorial Routes
app.get("/api/tutorials", async (req, res) => {
  try {
    // For testing, create some sample tutorials if none exist
    const tutorialsCount = await Tutorial.countDocuments()
    if (tutorialsCount === 0) {
      const sampleTutorials = [
        {
          title: "Home Composting Basics",
          description: "Learn how to start composting at home with minimal equipment",
          imageUrl: "https://images.unsplash.com/photo-1591955506264-3f5a6834570a?ixlib=rb-4.0.3",
          videoUrl: "",
          steps: [
            "Collect kitchen scraps like fruit and vegetable peels",
            "Mix with dry materials like leaves or shredded paper",
            "Keep your compost moist but not soggy",
            "Turn the pile regularly to add oxygen",
            "Harvest your compost after 3-6 months",
          ],
          category: "Composting",
        },
        {
          title: "Plastic Bottle Planters",
          description: "Turn plastic waste into beautiful plant containers",
          imageUrl: "https://images.unsplash.com/photo-1582131503261-fca1d1c781a8?ixlib=rb-4.0.3",
          videoUrl: "",
          steps: [
            "Clean a plastic bottle thoroughly",
            "Cut the bottle in half or create a side opening",
            "Make drainage holes in the bottom",
            "Decorate the outside if desired",
            "Add soil and plants",
          ],
          category: "Upcycling",
        },
        {
          title: "Paper Recycling at Home",
          description: "Make new paper from old newspapers and documents",
          imageUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?ixlib=rb-4.0.3",
          videoUrl: "",
          steps: [
            "Tear paper into small pieces",
            "Soak in water overnight",
            "Blend into a pulp",
            "Spread on a screen to dry",
            "Press and let dry completely",
          ],
          category: "Recycling",
        },
      ]

      await Tutorial.insertMany(sampleTutorials)
      console.log("Sample tutorials created")
    }

    const tutorials = await Tutorial.find()
    res.status(200).json({ success: true, tutorials })
  } catch (error) {
    console.error("Get tutorials error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// User Routes
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select("-password")
    res.status(200).json({ success: true, users })
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
