import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'

// Khởi tạo Octokit với token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

// Cấu hình Repository
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'owner-name'
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'repo-name'
const BRANCH = process.env.GITHUB_BRANCH || 'main'
const POOLS_DIRECTORY = process.env.GITHUB_POOLS_DIRECTORY || 'data/pools'

export async function GET(_request: NextRequest) {
  try {
    // Lấy danh sách file trong thư mục pools
    const { data: directoryContent } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: POOLS_DIRECTORY,
      ref: BRANCH,
    })

    // Kiểm tra xem directoryContent có phải là mảng không
    if (!Array.isArray(directoryContent)) {
      return NextResponse.json(
        { error: 'Không thể lấy danh sách pool, đường dẫn không phải là thư mục' },
        { status: 400 }
      )
    }

    // Lọc ra chỉ các file JSON
    const poolFiles = directoryContent.filter(
      item => item.type === 'file' && item.name.endsWith('.json')
    )

    // Lấy nội dung của từng file pool
    const poolsPromises = poolFiles.map(async file => {
      try {
        // Lấy nội dung file
        const { data: fileData } = await octokit.repos.getContent({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          path: file.path,
          ref: BRANCH,
        })

        if ('content' in fileData && 'encoding' in fileData) {
          // Giải mã nội dung file từ base64
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8')

          // Parse JSON
          const poolData = JSON.parse(content)

          return {
            ...poolData,
            githubUrl: fileData.html_url,
            lastUpdated: fileData.sha ? new Date().toISOString() : null,
          }
        }
        return null
      } catch (error) {
        console.error(`Error fetching pool data for ${file.path}:`, error)
        return null
      }
    })

    // Đợi tất cả các promise hoàn thành
    const pools = (await Promise.all(poolsPromises)).filter(Boolean)

    // Trả về danh sách pool
    return NextResponse.json({
      success: true,
      pools,
      count: pools.length,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: `Lỗi khi lấy danh sách pool từ GitHub: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    )
  }
}
