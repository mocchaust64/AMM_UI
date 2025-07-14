# AMM-UI

## Cấu hình cho tính năng lưu pool lên GitHub

Để sử dụng tính năng lưu thông tin pool lên GitHub, bạn cần cấu hình các biến môi trường trong file `.env.local`.

Bạn có thể sao chép từ file mẫu:

```bash
cp docs/env-github-api.example .env.local
```

Sau đó chỉnh sửa file `.env.local` với thông tin thích hợp:

```bash
# GitHub API Token - cần có quyền repo để push files
# Tạo token tại: https://github.com/settings/tokens
GITHUB_TOKEN=your_github_token_here

# Thông tin Repository
GITHUB_REPO_OWNER=your_username_or_organization
GITHUB_REPO_NAME=your_repository_name
GITHUB_BRANCH=main
GITHUB_POOLS_DIRECTORY=data/pools
```

## Cách hoạt động của API lưu pool lên GitHub

1. Khi một pool được tạo thành công và giao dịch đã được xác nhận trên Solana blockchain, hệ thống sẽ tự động gọi API để lưu thông tin pool lên GitHub dưới dạng file JSON.

2. Thông tin pool được lưu trong đường dẫn: `data/pools/{pool_address}.json`

3. Bạn có thể gọi API này bằng cách sử dụng webhook sau khi giao dịch tạo pool được xác nhận:

```
GET /api/create-pool?signature={tx_signature}&poolAddress={pool_address}&poolData={encoded_pool_data}
```

4. Hoặc gọi trực tiếp API để đẩy thông tin pool lên GitHub:

```
POST /api/upload-pool-to-github
Content-Type: application/json

{
  "poolAddress": "pool_address_here",
  "token0Mint": "token0_mint_address",
  "token1Mint": "token1_mint_address",
  "lpMintAddress": "lp_mint_address",
  ... thông tin khác của pool
}
```

## Đảm bảo Repository đã được cấu hình đúng

- Repository phải tồn tại
- GitHub token phải có quyền `repo` để push file
- Thư mục `data/pools` nên được tạo sẵn trong repository (hoặc API sẽ cố gắng tạo nó)
