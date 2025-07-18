/**
 * Các hàm tiện ích để xử lý lỗi một cách nhất quán trong toàn bộ ứng dụng
 */

/**
 * Hàm xử lý lỗi im lặng, đảm bảo biến lỗi được "sử dụng" để tránh cảnh báo ESLint
 * @param error Lỗi cần xử lý
 * @param message Thông báo tùy chọn để ghi log
 */
export function handleSilentError(error: unknown, message?: string): void {
  // Sử dụng biến error để tránh cảnh báo ESLint
  const _ = error

  // Bỏ qua lỗi AccountNotFoundError vì đây là lỗi bình thường khi token không có metadata
  if (error instanceof Error && error.message && error.message.includes('AccountNotFoundError')) {
    return
  }

  // Có thể thêm xử lý lỗi tùy chọn ở đây, ví dụ như ghi log lỗi trong môi trường phát triển
  if (process.env.NODE_ENV === 'development' && message) {
    // Ghi log lỗi trong môi trường phát triển nếu cần
    console.error(message, error)
  }
}
