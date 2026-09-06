import { useState } from 'react'
import { usePatient } from '../context/PatientContext'

// A persistent "Need help?" affordance shown on every data-collection
// page. If a patient is stuck or unfamiliar with the interface, tapping
// this simulates connecting them to a staff member who can take over
// data entry for that page.
//
// PROTOTYPE BEHAVIOUR: this mocks a short "connecting…" delay, then
// marks the current section as staff-assisted (visible later in the
// Doctor Summary). No real paging/notification happens yet.
//
// LATER: this should open a real request in a staff-facing queue/
// dashboard (or trigger a live remote-assist session), routed to the
// nearest available staff member, rather than a scripted delay.
export default function HelpButton({ sectionName }) {
  const { markAssisted } = usePatient()
  const [status, setStatus] = useState('idle') // idle | connecting | connected

  function requestHelp() {
    setStatus('connecting')
    setTimeout(() => {
      setStatus('connected')
      if (sectionName) markAssisted(sectionName)
    }, 2000)
  }

  function dismiss() {
    setStatus('idle')
  }

  return (
    <>
      <button type="button" className="help-fab" onClick={requestHelp} aria-label="Need help? Tap for staff assistance">
        <span className="help-fab__icon">?</span>
        <span className="help-fab__label">Need help?</span>
      </button>

      {status !== 'idle' && (
        <div className="help-modal-backdrop" role="dialog" aria-modal="true">
          <div className="help-modal">
            {status === 'connecting' && (
              <>
                <div className="help-modal__spinner" />
                <h3>Connecting you to a staff member…</h3>
                <p>Please wait a moment. Someone will be with you shortly.</p>
              </>
            )}
            {status === 'connected' && (
              <>
                <h3>Staff member connected</h3>
                <p>
                  This section can now be filled in with their help. The doctor will
                  see that this part of your form was completed with staff
                  assistance.
                </p>
                <button type="button" className="btn btn-primary" onClick={dismiss}>
                  Continue
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
