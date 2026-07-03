import re

with open('frontend/components/meetings/InviteesView.tsx', 'r') as f:
    content = f.read()

# 1. Update initial states
content = content.replace("const [editForm, setEditForm] = useState({ name: '', designation: '', department_id: '', office_id: '' });", "const [editForm, setEditForm] = useState({ name: '', email: '', designation: '', department_id: '', office_id: '' });")
content = content.replace("const [customForm, setCustomForm] = useState({ name: '', prefix: '', designation: '', department_id: '', office_id: '' });", "const [customForm, setCustomForm] = useState({ name: '', prefix: '', email: '', designation: '', department_id: '', office_id: '' });")

# 2. Update handleCreateCustomPresentee
content = content.replace("setCustomForm({ name: '', prefix: '', designation: '', department_id: '', office_id: '' });", "setCustomForm({ name: '', prefix: '', email: '', designation: '', department_id: '', office_id: '' });")
content = content.replace(
"""      const presenteeToAdd = {
        name: nameWithPrefix,
        designation: customForm.designation,
        department_id: customForm.department_id || null,
        office_id: customForm.office_id || null
      };""",
"""      const presenteeToAdd = {
        name: nameWithPrefix,
        email: customForm.email,
        designation: customForm.designation,
        department_id: customForm.department_id || null,
        office_id: customForm.office_id || null
      };"""
)
content = content.replace(
"""      await api.post(`/meetings/${meeting.id}/presentees`, { presentees: [presenteeToAdd] });
      toast.success("Custom presentee added successfully");""",
"""      if (isPast) {
        await api.post(`/meetings/${meeting.id}/presentees`, { presentees: [presenteeToAdd] });
        toast.success("Custom presentee added successfully");
      } else {
        await api.post(`/meetings/${meeting.id}/invitees`, { invitees: [presenteeToAdd] });
        toast.success("Custom invitee added successfully");
      }"""
)

# 3. Update handleUpdatePresentee
content = content.replace(
"""    try {
      await api.put(`/meetings/${meeting.id}/presentees/${editingPresentee.id}`, editForm);
      toast.success("Presentee updated successfully");""",
"""    try {
      if (isPast) {
        await api.put(`/meetings/${meeting.id}/presentees/${editingPresentee.id}`, editForm);
        toast.success("Presentee updated successfully");
      } else {
        await api.put(`/meetings/${meeting.id}/invitees/${editingPresentee.id}`, editForm);
        toast.success("Invitee updated successfully");
      }"""
)

# 4. Update handleEditClick
content = content.replace(
"""    setEditForm({
      name: row.name || '',
      designation: row.designation || '',
      department_id: row.department_id || '',
      office_id: row.office_id || ''
    });""",
"""    setEditForm({
      name: row.name || '',
      email: row.email || '',
      designation: row.designation || '',
      department_id: row.department_id || '',
      office_id: row.office_id || ''
    });"""
)

# 5. Enable editing for Invitees as well
content = content.replace("onEdit={!isLocked && isPast ? handleEditClick : undefined}", "onEdit={!isLocked ? handleEditClick : undefined}")

# 6. Change "Add Invitee" button logic
content = content.replace(
"""                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-primary text-primary-foreground px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                    Add Invitee
                  </button>""",
"""                  <button
                    onClick={() => {
                      const initiallySelected = allMembers
                        .filter((m: any) => invitees.some((p: any) => p.name === m.name && p.designation === m.designation))
                        .map((m: any) => m.id);
                      setSelectedMembers(initiallySelected);
                      setIsAddPresenteeModalOpen(true);
                    }}
                    className="bg-primary text-primary-foreground px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                    Add Invitee
                  </button>"""
)

# 7. Add Email fields to forms
content = content.replace(
"""                <div className="space-y-1">
                  <label className="text-xs font-medium">Prefix</label>
                  <input 
                    type="text" 
                    value={customForm.prefix}
                    onChange={(e) => setCustomForm(prev => ({ ...prev, prefix: e.target.value }))}
                    className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm"
                  />
                </div>
              </div>""",
"""                <div className="space-y-1">
                  <label className="text-xs font-medium">Prefix</label>
                  <input 
                    type="text" 
                    value={customForm.prefix}
                    onChange={(e) => setCustomForm(prev => ({ ...prev, prefix: e.target.value }))}
                    className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium">Email (for Invitees)</label>
                <input 
                  type="email" 
                  value={customForm.email}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm"
                />
              </div>"""
)

content = content.replace(
"""            <h3 className="text-lg font-semibold mb-4">Edit Presentee</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Name</label>
                  <input 
                    required
                    type="text" 
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm"
                  />
                </div>""",
"""            <h3 className="text-lg font-semibold mb-4">Edit {isPast ? 'Presentee' : 'Invitee'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Name</label>
                  <input 
                    required
                    type="text" 
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm"
                  />
                </div>
                {!isPast && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Email</label>
                    <input 
                      type="email" 
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm"
                    />
                  </div>
                )}"""
)

# 8. Add email to handleAddPresentees mapping
content = content.replace(
"""        .map((m: any) => ({
            name: m.name,
            designation: m.designation,
            department_id: m.department_id,
            office_id: m.office_id
        }));

      // Delete removed ones
      for (const p of presenteesToRemove) {
        await api.delete(`/meetings/${meeting.id}/presentees/${p.id}`);
      }

      // Add new ones
      if (presenteesToAdd.length > 0) {
        await api.post(`/meetings/${meeting.id}/presentees`, { presentees: presenteesToAdd });
      }

      toast.success("Presentees synced successfully");""",
"""        .map((m: any) => ({
            name: m.name,
            email: m.email || '',
            designation: m.designation,
            department_id: m.department_id,
            office_id: m.office_id
        }));

      // Delete removed ones
      for (const p of presenteesToRemove) {
        if (isPast) {
            await api.delete(`/meetings/${meeting.id}/presentees/${p.id}`);
        } else {
            await api.delete(`/meetings/${meeting.id}/invitees/${p.id}`);
        }
      }

      // Add new ones
      if (presenteesToAdd.length > 0) {
        if (isPast) {
            await api.post(`/meetings/${meeting.id}/presentees`, { presentees: presenteesToAdd });
        } else {
            await api.post(`/meetings/${meeting.id}/invitees`, { invitees: presenteesToAdd });
        }
      }

      toast.success(`${isPast ? 'Presentees' : 'Invitees'} synced successfully`);"""
)

# 9. Update modal title for "Create Custom"
content = content.replace("Create Custom Presentee", "Create Custom {isPast ? 'Presentee' : 'Invitee'}")
content = content.replace("Add Presentees", "Add {isPast ? 'Presentees' : 'Invitees'}")

# 10. Remove Old Placeholder
content = re.sub(r'\{\/\* Add Modal Placeholder \*\/\}.*?(?=\{\/\* Add Presentee Modal \*\/})', '', content, flags=re.DOTALL)


with open('frontend/components/meetings/InviteesView.tsx', 'w') as f:
    f.write(content)

