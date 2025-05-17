// server/index.js
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');


const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes'); // Import transaction routes
const userRoutes = require('./routes/userRoutes');
const agentRoutes = require('./routes/agentRoutes');
const merchantRoutes = require('./routes/merchantRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes')
const adminDataRoutes = require('./routes/adminDataRoutes');

const loanRoutes = require('./routes/loanRoutes'); // Import
const investmentRoutes = require('./routes/investmentRoutes'); // Import


dotenv.config();
connectDB();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.get('/', (req, res) => {
  res.send('CashPay API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes); // Use transaction routes
app.use('/api/user', userRoutes); // Use user routes
app.use('/api/agent', agentRoutes);
app.use('/api/merchants', merchantRoutes);


app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/data', adminDataRoutes);

app.use('/api/loans', loanRoutes);         // Use loan routes
app.use('/api/investments', investmentRoutes); // Use investment routes


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

const corsOptions = {
    origin: function (origin, callback) {
        // Replace 'https://your-frontend-domain.vercel.app' with your actual Vercel URL after deployment
        // Also allow your local frontend for continued development if needed
        const allowedOrigins = [
            'http://localhost:3000', // Your local React dev server
            'https://cashpay-six.vercel.app/' // Your deployed Vercel app
        ];
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));