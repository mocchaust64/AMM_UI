import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'

export async function GET(request: NextRequest) {
  try {
    // Kiểm tra xem token đã được cấu hình chưa
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error:
            'GitHub token chưa được cấu hình. Vui lòng thiết lập GITHUB_TOKEN trong file .env.local',
        },
        { status: 500 }
      )
    }

    // Khởi tạo Octokit với token
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    })

    // Kiểm tra thông tin người dùng để xác nhận token hoạt động
    const { data: user } = await octokit.users.getAuthenticated()

    // Kiểm tra repo đã được cấu hình chưa
    const repoOwner = process.env.GITHUB_REPO_OWNER || 'owner-name'
    const repoName = process.env.GITHUB_REPO_NAME || 'repo-name'
    const branch = process.env.GITHUB_BRANCH || 'main'

    let repoStatus = {
      exists: false,
      message: '',
    }

    // Kiểm tra repository có tồn tại không
    try {
      const { data: repo } = await octokit.repos.get({
        owner: repoOwner,
        repo: repoName,
      })
      repoStatus = {
        exists: true,
        message: `Đã tìm thấy repository: ${repo.full_name}`,
      }
    } catch (error) {
      repoStatus = {
        exists: false,
        message: `Repository ${repoOwner}/${repoName} không tồn tại hoặc không có quyền truy cập`,
      }
    }

    // Kiểm tra thư mục data/pools
    const poolsDirectory = process.env.GITHUB_POOLS_DIRECTORY || 'data/pools'
    let directoryStatus = {
      exists: false,
      message: '',
    }

    if (repoStatus.exists) {
      try {
        await octokit.repos.getContent({
          owner: repoOwner,
          repo: repoName,
          path: poolsDirectory,
          ref: branch,
        })
        directoryStatus = {
          exists: true,
          message: `Thư mục ${poolsDirectory} đã tồn tại`,
        }
      } catch (error) {
        directoryStatus = {
          exists: false,
          message: `Thư mục ${poolsDirectory} không tồn tại. Cần tạo thư mục này hoặc API sẽ tự động tạo khi lưu pool đầu tiên.`,
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        login: user.login,
        name: user.name,
        id: user.id,
      },
      repository: repoStatus,
      directory: directoryStatus,
      config: {
        repoOwner,
        repoName,
        branch,
        poolsDirectory,
      },
    })
  } catch (error: any) {
    console.error('GitHub API error:', error)
    return NextResponse.json(
      { error: `Lỗi khi kiểm tra kết nối GitHub: ${error.message}` },
      { status: 500 }
    )
  }
}
