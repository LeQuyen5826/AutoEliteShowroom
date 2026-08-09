import CarsPage from './CarsPage'

// Trang xe mới — lọc theo trường condition = 'new_car' (được chọn khi thêm xe)
export default function NewCarsPage() {
  return <CarsPage defaultFilter={{ condition: 'new_car' }} title="Xe mới" />
}