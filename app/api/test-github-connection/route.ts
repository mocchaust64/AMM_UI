import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'

export async function GET(_request: NextRequest) {
  try {
    // Kiểm tra xem token đã được cấu hình chưa
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          message: 'GitHub token is not configured',
        },
        { status: 500 }
      )
    }

    // Khởi tạo Octokit với GitHub token
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    })

    // Thử lấy thông tin người dùng để xác nhận kết nối
    const { data } = await octokit.users.getAuthenticated()

    // Trả về thông tin kết nối thành công
    return NextResponse.json({
      success: true,
      message: 'GitHub connection successful',
      user: {
        login: data.login,
        name: data.name,
      },
    })
  } catch (error: unknown) {
    // Xử lý lỗi và trả về thông báo lỗi
    return NextResponse.json(
      {
        success: false,
        message: `GitHub connection failed: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    )
  }
}
