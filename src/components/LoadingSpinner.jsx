export default function LoadingSpinner({ message = 'Procesando...' }) {
  return (
    <div className="fixed inset-0 bg-gray-900/80 flex flex-col items-center justify-center z-50 gap-5">
      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-white font-medium text-base px-6 text-center">{message}</p>
    </div>
  )
}
