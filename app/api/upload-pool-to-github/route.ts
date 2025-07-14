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

export async function POST(request: NextRequest) {
  try {
    // Parse request body để lấy thông tin pool
    const poolData = await request.json()

    // Validate dữ liệu pool
    if (!poolData || !poolData.poolAddress) {
      return NextResponse.json(
        { error: 'Dữ liệu pool không hợp lệ hoặc thiếu địa chỉ pool' },
        { status: 400 }
      )
    }

    // Tạo tên file dựa trên địa chỉ pool
    const fileName = `${poolData.poolAddress}.json`
    const filePath = `${POOLS_DIRECTORY}/${fileName}`

    // Chuyển đổi dữ liệu pool thành chuỗi JSON đẹp
    const poolJson = JSON.stringify(poolData, null, 2)

    try {
      // Kiểm tra xem file đã tồn tại hay chưa để quyết định tạo mới hay cập nhật
      let sha = ''
      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          path: filePath,
          ref: BRANCH,
        })

        if ('sha' in fileData) {
          sha = fileData.sha
        }
      } catch (error) {
        // File không tồn tại, tiếp tục tạo mới
      }

      // Tạo hoặc cập nhật file trên GitHub
      const response = await octokit.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: filePath,
        message: sha
          ? `Cập nhật pool: ${poolData.poolAddress}`
          : `Thêm pool mới: ${poolData.poolAddress}`,
        content: Buffer.from(poolJson).toString('base64'),
        branch: BRANCH,
        ...(sha ? { sha } : {}),
      })

      // Trả về thành công
      return NextResponse.json({
        success: true,
        message: `Pool đã được lưu thành công lên GitHub tại: ${filePath}`,
        fileUrl: response.data.content?.html_url,
      })
    } catch (error: any) {
      console.error('GitHub API error:', error)
      return NextResponse.json(
        { error: `Lỗi khi giao tiếp với GitHub API: ${error.message}` },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: `Đã xảy ra lỗi khi xử lý yêu cầu: ${error.message}` },
      { status: 500 }
    )
  }
}
