/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: async () => {
    return 'force-fresh-build-' + Date.now()
  }
};

export default nextConfig;
