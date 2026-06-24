import { useEffect, useMemo, useRef, useState } from 'react'
import { categories, products, restaurant } from './data/menu'

const languageStorageKey = 'menu-language'

const languageMeta = {
  en: { dir: 'ltr', currency: 'IQD' },
  ar: { dir: 'rtl', currency: 'د.ع' },
}

const fallbackImage = '/fallbacks/menu-item.svg'

function App() {
  const mainContentRef = useRef(null)
  const mainPageScrollRef = useRef(0)
  const selectedCategoryIdRef = useRef(null)
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') {
      return 'ar'
    }

    const savedLanguage = window.localStorage.getItem(languageStorageKey)

    return savedLanguage === 'en' || savedLanguage === 'ar' ? savedLanguage : 'ar'
  })
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showBackButton, setShowBackButton] = useState(true)

  const availableProducts = useMemo(
    () => products.filter((product) => product.available),
    [],
  )

  const categoryEntries = useMemo(
    () =>
      categories
        .filter((category) => category.id !== 'all')
        .map((category) => {
          const categoryProducts = availableProducts.filter(
            (product) => product.category === category.id,
          )

          return {
            ...category,
            image: category.image ?? categoryProducts[0]?.image ?? restaurant.logo,
            products: categoryProducts,
            productCount: categoryProducts.length,
          }
        })
        .filter((category) => category.productCount > 0),
    [availableProducts],
  )

  const selectedCategory = useMemo(
    () =>
      categoryEntries.find((category) => category.id === selectedCategoryId) ?? null,
    [categoryEntries, selectedCategoryId],
  )

  useEffect(() => {
    selectedCategoryIdRef.current = selectedCategoryId
  }, [selectedCategoryId])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow

    if (selectedProduct) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [selectedProduct])

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language)
  }, [language])

  useEffect(() => {
    if (!selectedCategoryId) {
      setShowBackButton(true)
      return undefined
    }

    let previousScrollY = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY <= 64) {
        setShowBackButton(true)
      } else if (currentScrollY > previousScrollY) {
        setShowBackButton(false)
      } else if (currentScrollY < previousScrollY) {
        setShowBackButton(true)
      }

      previousScrollY = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [selectedCategoryId])

  useEffect(() => {
    const handlePopState = () => {
      if (!selectedCategoryIdRef.current) {
        return
      }

      setSelectedCategoryId(null)

      window.requestAnimationFrame(() => {
        if (mainContentRef.current) {
          mainContentRef.current.scrollTop = 0
        }

        window.scrollTo(0, mainPageScrollRef.current)
      })
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const formatPrice = (price) => {
    const formatted = new Intl.NumberFormat(language === 'ar' ? 'ar-IQ' : 'en-US').format(
      price,
    )

    return language === 'ar'
      ? `${formatted} ${languageMeta[language].currency}`
      : `${languageMeta[language].currency} ${formatted}`
  }

  const getText = (item, key) => item[`${key}_${language}`]

  const handleSelectCategory = (categoryId) => {
    mainPageScrollRef.current = typeof window !== 'undefined' ? window.scrollY : 0
    setSelectedCategoryId(categoryId)

    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0
    }

    if (typeof document !== 'undefined') {
      const scrollingElement = document.scrollingElement

      if (scrollingElement) {
        scrollingElement.scrollTop = 0
      }
    }

    if (typeof window !== 'undefined') {
      window.history.pushState(
        { view: 'category', categoryId },
        '',
        window.location.href,
      )

      try {
        window.scrollTo({ top: 0, behavior: 'instant' })
      } catch {
        window.scrollTo(0, 0)
      }
    }
  }

  const handleBackToCategories = () => {
    if (typeof window !== 'undefined') {
      if (window.history.state?.view === 'category') {
        window.history.back()
        return
      }
    }

    setSelectedCategoryId(null)

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        if (mainContentRef.current) {
          mainContentRef.current.scrollTop = 0
        }

        window.scrollTo(0, mainPageScrollRef.current)
      })
    }
  }

  return (
    <div
      className="min-h-screen bg-neutral-950 text-stone-100"
      dir={languageMeta[language].dir}
    >
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(217,119,6,0.24),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.18),_transparent_28%),linear-gradient(180deg,_#121117,_#09090b_58%,_#050507)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,_rgba(255,255,255,0.08),_transparent)]" />

        <main
          ref={mainContentRef}
          className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
        >
          <Header language={language} setLanguage={setLanguage} />

          {selectedCategory ? (
            <>
              <FloatingBackButton
                language={language}
                onBack={handleBackToCategories}
                visible={showBackButton}
              />
              <CategoryView
                category={selectedCategory}
                formatPrice={formatPrice}
                getText={getText}
                language={language}
                onSelectProduct={setSelectedProduct}
              />
            </>
          ) : (
            <CategoryGrid
              categories={categoryEntries}
              getText={getText}
              language={language}
              onSelectCategory={handleSelectCategory}
            />
          )}
        </main>
      </div>

      {selectedProduct ? (
        <ProductModal
          formatPrice={formatPrice}
          getText={getText}
          language={language}
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
        />
      ) : null}
    </div>
  )
}

function Header({ language, setLanguage }) {
  return (
    <header className="glass-panel flex flex-col gap-4 rounded-[28px] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <img
          alt={restaurant.name_en}
          className="h-16 w-16 rounded-2xl border border-white/15 object-cover shadow-[0_14px_40px_rgba(0,0,0,0.45)]"
          decoding="async"
          src={restaurant.logo}
        />
        <h1 className="truncate font-display text-3xl text-white sm:text-4xl">
          {language === 'ar' ? restaurant.name_ar : restaurant.name_en}
        </h1>
      </div>

      <div className="flex self-start rounded-full border border-white/10 bg-white/5 p-1 sm:self-auto">
        <LanguageButton
          active={language === 'en'}
          label="EN"
          onClick={() => setLanguage('en')}
        />
        <LanguageButton
          active={language === 'ar'}
          label="AR"
          onClick={() => setLanguage('ar')}
        />
      </div>
    </header>
  )
}

function LanguageButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-white text-neutral-950 shadow-[0_8px_30px_rgba(255,255,255,0.15)]'
          : 'text-stone-300 hover:text-white'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function CategoryGrid({ categories, getText, language, onSelectCategory }) {
  return (
    <section className="grid grid-cols-1 gap-4 pb-6 sm:grid-cols-2 xl:grid-cols-3">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          className="glass-panel group overflow-hidden rounded-[28px] p-3 text-left transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/10"
          onClick={() => onSelectCategory(category.id)}
        >
          <div className="overflow-hidden rounded-[22px]">
            <MenuImage
              alt={getText(category, 'label')}
              className="h-52 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-56"
              loading="lazy"
              src={category.image}
            />
          </div>
          <div className="space-y-2 px-1 pb-2 pt-4">
            <h2 className="font-display text-2xl text-white sm:text-[1.9rem]">
              {getText(category, 'label')}
            </h2>
            <p className="text-sm text-stone-400 sm:text-base">
              {language === 'ar'
                ? `${category.productCount} عناصر`
                : `${category.productCount} items`}
            </p>
          </div>
        </button>
      ))}
    </section>
  )
}

function CategoryView({
  category,
  formatPrice,
  getText,
  language,
  onSelectProduct,
}) {
  return (
    <section className="space-y-5 pb-6">
      <div className="glass-panel flex items-center justify-between gap-4 rounded-[28px] px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate font-display text-3xl text-white sm:text-4xl">
            {getText(category, 'label')}
          </h2>
          <p className="mt-2 text-sm text-stone-400 sm:text-base">
            {language === 'ar'
              ? `${category.productCount} عناصر`
              : `${category.productCount} items`}
          </p>
        </div>

        <img
          alt={getText(category, 'label')}
          className="hidden h-24 w-24 rounded-[24px] object-cover sm:block"
          decoding="async"
          src={category.image}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {category.products.map((product) => (
          <button
            key={product.id}
            type="button"
            className="glass-panel group overflow-hidden rounded-[24px] p-2.5 text-left transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 sm:rounded-[28px] sm:p-3"
            onClick={() => onSelectProduct(product)}
          >
            <div className="overflow-hidden rounded-[18px] sm:rounded-[22px]">
              <MenuImage
                alt={getText(product, 'name')}
                className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
                src={product.image}
              />
            </div>
            <div className="space-y-1.5 px-1 pb-1 pt-3 sm:space-y-2 sm:pt-4">
              <h3 className="line-clamp-2 text-[0.92rem] font-medium leading-6 text-white sm:text-base">
                {getText(product, 'name')}
              </h3>
              <p className="text-sm leading-5 text-amber-100/80 sm:text-base">
                {formatPrice(product.price)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function FloatingBackButton({ language, onBack, visible }) {
  const positionClass = language === 'ar' ? 'right-4 sm:right-6' : 'left-4 sm:left-6'

  return (
    <button
      type="button"
      className={`glass-panel fixed top-4 z-[70] inline-flex h-12 items-center justify-center rounded-full px-4 text-sm font-medium text-stone-200 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95 sm:top-6 ${
        visible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-3 opacity-0 pointer-events-none'
      } ${positionClass}`}
      onClick={onBack}
    >
      {language === 'ar' ? 'رجوع' : 'Back'}
    </button>
  )
}

function MenuImage({ alt, className, loading = 'eager', src }) {
  const [imageSrc, setImageSrc] = useState(src)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setImageSrc(src)
    setIsLoaded(false)
  }, [src])

  const handleError = () => {
    if (imageSrc !== fallbackImage) {
      setImageSrc(fallbackImage)
      setIsLoaded(false)
      return
    }

    setIsLoaded(true)
  }

  return (
    <div className="relative h-full w-full bg-neutral-900/40">
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] transition-opacity duration-300 ${
          isLoaded ? 'opacity-0' : 'animate-pulse opacity-100'
        }`}
      />
      <img
        alt={alt}
        className={`${className} h-full w-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        decoding="async"
        fetchPriority={loading === 'lazy' ? 'low' : 'high'}
        loading={loading}
        onError={handleError}
        onLoad={() => setIsLoaded(true)}
        src={imageSrc}
      />
    </div>
  )
}

function ProductModal({ formatPrice, getText, language, onClose, product }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const ingredients = getText(product, 'ingredients')

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="glass-panel flex max-h-[calc(100dvh-32px)] w-full max-w-xl flex-col overflow-y-auto overflow-x-hidden rounded-[28px] sm:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative">
          <MenuImage
            alt={getText(product, 'name')}
            className="h-[36vh] min-h-44 max-h-[40vh] w-full object-cover sm:h-72"
            loading="eager"
            src={product.image}
          />
          <button
            type="button"
            aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/45 text-xl text-white transition hover:bg-black/70"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-4 sm:space-y-4 sm:p-6">
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl leading-tight text-white sm:text-3xl">
              {getText(product, 'name')}
            </h2>
            <p className="text-base text-amber-100/85 sm:text-lg">
              {formatPrice(product.price)}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400">
              {language === 'ar' ? 'المكونات' : 'Ingredients'}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-200 sm:text-base">{ingredients}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
