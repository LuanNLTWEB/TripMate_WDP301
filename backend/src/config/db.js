import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';

dotenv.config();

const connectDB = async () => {
  try {
    const connectionOptions = {
      dbName: process.env.DB_NAME || 'tripmate_WDP301'
    };

    let conn;
    try {
      conn = await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
    } catch (error) {
      const isSrvDnsRefused = error.code === 'ECONNREFUSED' && error.syscall === 'querySrv';
      if (!isSrvDnsRefused) throw error;

      const fallbackDnsServers = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1')
        .split(',')
        .map((server) => server.trim())
        .filter(Boolean);

      console.warn('Default DNS could not resolve MongoDB SRV. Retrying with fallback DNS...');
      dns.setServers(fallbackDnsServers);
      conn = await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
    }

    console.log(`MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
