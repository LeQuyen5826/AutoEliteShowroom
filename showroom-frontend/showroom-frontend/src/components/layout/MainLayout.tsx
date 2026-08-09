import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import ChatWidget from '@/components/ChatWidget'

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {/* Chatbot AI nổi — hiển thị trên mọi trang */}
      <ChatWidget />
    </div>
  )
}