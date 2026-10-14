'use client'

import { AdminButton } from './ui'

/** Deletes an account for good and emails its owner. Says so out loud if the email could not be sent. */
export function DeleteAccountButton({ id, email }: { id: string; email: string }) {
  return (
    <AdminButton
      variant="danger"
      url={`/api/admin/users/${id}`}
      data={{ action: 'delete' }}
      ask={{ label: 'Reason (they will see it)', required: true }}
      secret="Deleting an account cannot be undone."
      confirm={`Permanently delete ${email}? This cannot be undone. They are emailed the reason.`}
      onDone={(j) => {
        if ((j as { emailed?: boolean } | null)?.emailed === false) window.alert('The account was deleted, but the email could not be sent. Let them know another way.')
      }}
    >
      Delete account
    </AdminButton>
  )
}
