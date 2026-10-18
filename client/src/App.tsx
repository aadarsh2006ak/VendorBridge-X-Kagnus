export function App() {
  return (
    <div className="min-h-screen bg-canvas text-content-primary flex flex-col items-center justify-center p-6">
      <div className="bg-surface border border-border p-8 rounded-xl max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 bg-brand rounded-lg flex items-center justify-center mx-auto text-white font-bold text-xl">
          VB
        </div>
        <h1 className="text-2xl font-semibold">VendorBridge ERP</h1>
        <p className="text-content-secondary text-sm">
          Procurement & Vendor Management Platform — Week 1 Initialized
        </p>
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-subtle text-status-success border border-brand/30">
          ● System Ready
        </div>
      </div>
    </div>
  );
}

export default App;
