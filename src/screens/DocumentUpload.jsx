import { useRef } from 'react'
import ScreenShell from '../components/ScreenShell'
import { IconUpload, IconFile } from '../components/icons'
import { usePatient } from '../context/PatientContext'
import { useLanguage } from '../context/LanguageContext'

// This screen now runs REAL client-side OCR (via Tesseract.js) on
// uploaded images, extracting whatever text it can find — e.g. from a
// photographed prescription or lab report. PDFs are recorded but not
// OCR'd here (that would need pdf.js to rasterize pages first).
//
// LATER: swap this for a proper backend OCR/document-AI pipeline that
// can handle handwritten and multilingual documents and structure the
// extracted text into diagnoses / medication / lab values, per Module B
// of the problem statement.

let idCounter = 1

export default function DocumentUpload() {
  const { data, setDocuments, updateDocument } = usePatient()
  const { t } = useLanguage()
  const inputRef = useRef(null)

  async function handleFiles(fileList) {
    const files = Array.from(fileList)

    const newDocs = files.map((file) => ({
      id: idCounter++,
      name: file.name,
      type: file.type || 'Unknown type',
      status: file.type.startsWith('image/') ? 'Reading text…' : 'Uploaded',
      uploadedAt: new Date().toISOString(),
      ocrText: '',
    }))

    setDocuments([...data.documents, ...newDocs])

    // Kick off OCR for image files only; run each in the background and
    // patch its own row in via updateDocument once done.
    files.forEach((file, i) => {
      if (!file.type.startsWith('image/')) return
      const docId = newDocs[i].id
      runOcr(file, docId)
    })
  }

  async function runOcr(file, docId) {
    try {
      const { default: Tesseract } = await import('tesseract.js')
      const result = await Tesseract.recognize(file, 'eng')
      const text = result?.data?.text?.trim() || ''
      updateDocument(docId, { status: text ? 'Text extracted' : 'Uploaded (no text found)', ocrText: text })
    } catch (err) {
      updateDocument(docId, { status: 'Uploaded (OCR failed)' })
    }
  }

  function removeDoc(id) {
    setDocuments(data.documents.filter((d) => d.id !== id))
  }

  return (
    <ScreenShell
      path="/documents"
      sectionName="documents"
      title={t('documents.title')}
      intro={t('documents.intro')}
      onNext={() => true}
      nextLabel={data.documents.length ? t('common.next') : t('common.skip')}
    >
      <div
        className="upload-box"
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <IconUpload style={{ marginBottom: 8 }} />
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{t('documents.tapUpload')}</div>
        <div style={{ fontSize: 13 }}>{t('documents.uploadHint')}</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {data.documents.map((doc) => (
        <div className="file-row" key={doc.id} style={{ flexWrap: 'wrap' }}>
          <div className="file-row__icon">
            <IconFile />
          </div>
          <div className="file-row__meta">
            <div className="file-row__name">{doc.name}</div>
            <div className="file-row__type">{doc.type}</div>
          </div>
          <div className="file-row__status">{doc.status}</div>
          <button className="file-row__remove" onClick={() => removeDoc(doc.id)} type="button">
            {t('documents.remove')}
          </button>
          {doc.ocrText && (
            <div className="ocr-preview">
              <strong>Extracted text (preview):</strong>
              <p>{doc.ocrText.slice(0, 300)}{doc.ocrText.length > 300 ? '…' : ''}</p>
            </div>
          )}
        </div>
      ))}
    </ScreenShell>
  )
}
