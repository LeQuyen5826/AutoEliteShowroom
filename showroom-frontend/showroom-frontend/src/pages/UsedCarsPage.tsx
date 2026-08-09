import CarsPage from './CarsPage'

// Trang xe đã qua sử dụng — lọc theo trường condition = 'used_car'
export default function UsedCarsPage() {
  return <CarsPage defaultFilter={{ condition: 'used_car' }} title="Xe đã qua sử dụng" />
}