/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "firebasestorage.googleapis.com",
      "lh3.googleusercontent.com",
    ],
  },
  env: {
    TERRA_API_KEY: process.env.TERRA_API_KEY,
    TERRA_DEV_ID: process.env.TERRA_DEV_ID,
    TERRA_SECRET: process.env.TERRA_SECRET,
  },
};

module.exports = nextConfig;
