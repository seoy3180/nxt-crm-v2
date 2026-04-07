import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: 'export', // 동적 라우트([id]) 사용을 위해 비활성화. 배포 시 S3 대신 ECS/Lambda 사용.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
