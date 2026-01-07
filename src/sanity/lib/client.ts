import { createClient } from 'next-sanity'

export const client = createClient({
  projectId: 'nbpf7c4u',
  dataset: 'fornini',
  apiVersion: '2024-01-01',
  useCdn: false, // Désactivé pour avoir les données fraîches
})
