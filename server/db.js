import mongoose from 'mongoose';

const ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 15_000;

// Slow or unreachable network: worth another try. A wrong password or URL is not.
const isNetworkTrouble = (error) =>
  /ServerSelection|MongoNetwork|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|querySrv/i.test(`${error.name} ${error.message}`);

/**
 * Connects to MongoDB. Tries a few times when the network is slow (a cloud database can
 * take a while to answer the first time), then fails with a readable message instead of
 * hanging. It never prints the connection string, which contains the database password.
 */
export async function connectDb({ mongoUrl, mongoDb }) {
  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(mongoUrl, { dbName: mongoDb, serverSelectionTimeoutMS: ATTEMPT_TIMEOUT_MS });
      return mongoose.connection;
    } catch (error) {
      lastError = error;
      if (!isNetworkTrouble(error) || attempt === ATTEMPTS) break;
      console.warn(`MongoDB did not answer (attempt ${attempt} of ${ATTEMPTS}). Trying again…`);
    }
  }

  const hint = isNetworkTrouble(lastError)
    ? " Check the MONGOURL value and, on MongoDB Atlas, that this machine's IP is allowed under Network Access."
    : /auth/i.test(lastError.message)
      ? ' Check the username and password in MONGOURL.'
      : '';
  throw new Error(`Could not connect to MongoDB (${lastError.name}).${hint}`, { cause: lastError });
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
