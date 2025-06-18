const mongoose = require('mongoose');

const connectionString = process.env.MONGODB_URI;
const connectionsParams = {
    useNewUrlParser: true,
    useUnifiedTopology: true
}
const connectToDatabase = async () => {
    try {
        await mongoose.connect(connectionString, connectionsParams);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}
module.exports = connectToDatabase;