import { Link } from 'react-router-dom'

type BrandLogoProps = {
  compact?: boolean
  inverse?: boolean
  size?: 'sm' | 'md' | 'lg'
  linkToHome?: boolean
}

const LOGO_SIZES = {
  sm: { image: 'h-8 w-11', text: 'text-xs' },
  md: { image: 'h-10 w-14', text: 'text-sm' },
  lg: { image: 'h-14 w-20', text: 'text-base' },
}

export default function BrandLogo({
  compact = false,
  inverse = false,
  size = 'sm',
  linkToHome = true,
}: BrandLogoProps) {
  const content = (
    <>
      <img
        src="/brand/autoelite-mark.png"
        alt=""
        className={`${LOGO_SIZES[size].image} shrink-0 object-contain`}
      />
      {!compact && (
        <span className={`font-display font-extrabold leading-none tracking-tight ${LOGO_SIZES[size].text} ${inverse ? 'text-white' : 'text-neutral-900'}`}>
          Auto<span className={inverse ? 'text-primary-400' : 'text-primary-600'}>Elite</span>
        </span>
      )}
    </>
  )

  const className = "inline-flex flex-col items-center justify-center gap-1 shrink-0"

  return linkToHome ? (
    <Link to="/" className={className} aria-label="AutoElite Showroom - Trang chủ">
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}
