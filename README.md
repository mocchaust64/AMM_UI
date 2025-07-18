# AMM-UI

A modern and user-friendly interface for interacting with Automated Market Makers (AMMs) on the Solana blockchain. Built with Next.js and integrated with Raydium AMM protocol.

![AMM-UI](https://i.imgur.com/placeholder.png)

## Features

- **Token Swap**: Easily swap tokens with optimal rates
- **Liquidity Pool Management**: Create and manage liquidity pools
- **Token Information**: View detailed token information including extensions
- **Token-2022 Support**: Full support for Solana's Token-2022 standard including transfer hooks
- **GitHub Integration**: Save and load pool information from GitHub repositories
- **Modern UI**: Built with a clean, responsive design using Tailwind CSS and shadcn/ui components

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Solana devnet account with SOL for testing
- GitHub account (for pool storage features)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/AMM-UI.git
cd AMM-UI
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Edit `.env.local` with your configuration:

```
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## GitHub Pool Storage Configuration

To use the GitHub pool storage feature, configure the following environment variables in your `.env.local` file:

```bash
# GitHub API Token - requires repo permission to push files
# Create token at: https://github.com/settings/tokens
GITHUB_TOKEN=your_github_token_here

# Repository Information
GITHUB_REPO_OWNER=your_username_or_organization
GITHUB_REPO_NAME=your_repository_name
GITHUB_BRANCH=main
GITHUB_POOLS_DIRECTORY=data/pools
```

You can copy from the example file:

```bash
cp docs/env-github-api.example .env.local
```

## How the GitHub Pool Storage API Works

1. When a pool is successfully created and the transaction is confirmed on the Solana blockchain, the system automatically calls an API to save the pool information to GitHub as a JSON file.

2. Pool information is stored at the path: `data/pools/{pool_address}.json`

3. You can call this API using a webhook after the pool creation transaction is confirmed:

```
GET /api/create-pool?signature={tx_signature}&poolAddress={pool_address}&poolData={encoded_pool_data}
```

4. Or directly call the API to push pool information to GitHub:

```
POST /api/upload-pool-to-github
Content-Type: application/json

{
  "poolAddress": "pool_address_here",
  "token0Mint": "token0_mint_address",
  "token1Mint": "token1_mint_address",
  "lpMintAddress": "lp_mint_address",
  ... other pool information
}
```

### Repository Configuration Requirements

- Repository must exist
- GitHub token must have `repo` permission to push files
- The `data/pools` directory should be created in advance (or the API will attempt to create it)

## Usage Guide

### Swapping Tokens

1. Connect your wallet using the "Connect Wallet" button
2. Select the tokens you want to swap from the dropdown menus
3. Enter the amount you want to swap
4. Click "Swap" to execute the transaction

### Creating a Liquidity Pool

1. Navigate to the "Create Pool" page
2. Select the two tokens for the pool
3. Set the initial liquidity amounts
4. Click "Create Pool" to create the pool on the Solana blockchain

## Project Structure

```
AMM-UI/
├── app/              # Next.js app directory
├── components/       # React components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and services
│   ├── contexts/     # React contexts
│   ├── service/      # Service layer for API interactions
│   └── utils/        # Helper utilities
├── public/           # Static files
└── styles/           # Global styles
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Solana](https://solana.com/) - Blockchain platform
- [Raydium](https://raydium.io/) - AMM protocol
- [Next.js](https://nextjs.org/) - React framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [TailwindCSS](https://tailwindcss.com/) - CSS framework.
