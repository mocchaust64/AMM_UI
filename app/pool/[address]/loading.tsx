import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="flex items-center justify-center h-[70vh]">
              <div className="text-center">
                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-medium">Loading Pool Details</h3>
                <p className="text-muted-foreground">
                  Please wait while we fetch the pool information...
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
