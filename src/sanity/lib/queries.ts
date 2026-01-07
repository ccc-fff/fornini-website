import { defineQuery } from 'next-sanity'

export const SLIDESHOW_QUERY = defineQuery(`
  *[_type == "slideshow"][0] {
    _id,
    title,
    defaultDuration,
    slides[] {
      _key,
      _type,
      scale,
      position,
      duration,
      _type == "slideImage" => {
        image {
          asset->{
            _id,
            url,
            metadata {
              lqip,
              dimensions { width, height }
            }
          },
          hotspot,
          crop
        },
        alt
      },
      _type == "slideVimeo" => {
        vimeoId
      }
    }
  }
`)
