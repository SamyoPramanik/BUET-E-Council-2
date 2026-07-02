"use client";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">Profile Settings</h2>
      </div>

      <div className="bg-card p-6 rounded-lg border border-border shadow-sm max-w-2xl">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Name</label>
                <input type="text" defaultValue="Samyo Pramanik" className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Username</label>
                <input type="text" defaultValue="admin" disabled className="w-full px-3 py-2 bg-muted text-muted-foreground border border-input rounded-md cursor-not-allowed" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input type="email" defaultValue="admin@buet.ac.bd" className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground" />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Update Password</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Current Password</label>
              <input type="password" placeholder="••••••••" className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">New Password</label>
                <input type="password" placeholder="••••••••" className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Confirm Password</label>
                <input type="password" placeholder="••••••••" className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:opacity-90 font-medium transition-opacity">
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
