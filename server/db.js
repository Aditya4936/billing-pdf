import mongoose from 'mongoose';

/**
 * Connects to MongoDB. Fails fast (10 s) with a readable message instead of hanging,
 * and never prints the connection string, which contains the database password.
 */
export async function connectDb({ mongoUrl, mongoDb }) {
  try {
    await mongoose.connect(mongoUrl, { dbName: mongoDb, serverSelectionTimeoutMS: 10_000 });
  } catch (error) {
    const hint = /ENOTFOUND|ECONNREFUSED|timed out|Server selection/i.test(error.message)
      ? ' Check the MONGOURL value and, on MongoDB Atlas, that this machine\'s IP is allowed under Network Access.'
      : /auth/i.test(error.message)
        ? ' Check the username and password in MONGOURL.'
        : '';
    throw new Error(`Could not connect to MongoDB (${error.name}).${hint}`, { cause: error });
  }
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
