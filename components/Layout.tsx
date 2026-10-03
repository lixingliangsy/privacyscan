import React, { ReactNode } from 'react'
import { PRODUCT } from '../lib/product'
import { useT } from '../lib/i18n/provider'
import LanguageSwitcher from './LanguageSwitcher'

// Fleet-standard layout: sticky header + §14.2.1 nav + LanguageSwitcher + legal footer.
const Layout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useT()
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <a
              href="https://lxsaihub.com"
              className="text-xs font-medium text-gray-500 hover:text-brand whitespace-nowrap"
              title={t('nav.backToHub')}
            >
              &larr; {t('nav.backToHub')}
            </a>
            <span className="text-gray-300">|</span>
            <span className="text-2xl font-bold text-brand">{PRODUCT.name}</span>
          </div>
          <nav className="hidden md:flex gap-4 text-sm items-center">
            <a href="/" className="text-gray-600 hover:text-brand">
              {t('nav.home')}
            </a>
            <a href="/#features" className="text-gray-600 hover:text-brand">
              {t('nav.features')}
            </a>
            <a href="/how-it-works" className="text-gray-600 hover:text-brand">
              {t('nav.howItWorks')}
            </a>
            <a href="/use-cases" className="text-gray-600 hover:text-brand">
              {t('nav.useCases')}
            </a>
            <a href="/integrations" className="text-gray-600 hover:text-brand">
              {t('nav.integrations')}
            </a>
            <a href="/security" className="text-gray-600 hover:text-brand">
              {t('nav.security')}
            </a>
            <a href="/#pricing" className="text-gray-600 hover:text-brand">
              {t('nav.pricing')}
            </a>
            <a href="/blog" className="text-gray-600 hover:text-brand">
              {t('nav.blog')}
            </a>
            <a href="/#faq" className="text-gray-600 hover:text-brand">
              {t('nav.faq')}
            </a>
            <a href="/feedback" className="text-gray-600 hover:text-brand">
              {t('nav.feedback')}
            </a>
            <LanguageSwitcher />
          </nav>
          <a
            href="/#signup"
            className="text-sm px-4 py-2 rounded-lg bg-brand text-white font-medium hover:opacity-90 whitespace-nowrap"
          >
            {t('nav.subscribe')}
          </a>
        </div>
        <div className="md:hidden border-t border-gray-100 px-4 py-2 flex justify-end">
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-10">{children}</main>

      <footer className="bg-gray-900 text-gray-300 mt-auto">
        <div className="container mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">{PRODUCT.name}</h3>
            <p className="text-sm">{t('common.tagline')}</p>
            <p className="text-xs text-gray-500 mt-3">{t('footer.partOfFleet')}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">{t('footer.product')}</h3>
            <ul className="text-sm space-y-1">
              <li>
                <a className="hover:text-white" href="/#features">
                  {t('nav.features')}
                </a>
              </li>
              <li>
                <a className="hover:text-white" href="/#pricing">
                  {t('nav.pricing')}
                </a>
              </li>
              <li>
                <a className="hover:text-white" href="/#faq">
                  {t('nav.faq')}
                </a>
              </li>
              <li>
                <a className="hover:text-white" href="/blog">
                  {t('nav.blog')}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">{t('footer.legal')}</h3>
            <ul className="text-sm space-y-1">
              <li>
                <a className="hover:text-white" href="/terms.html">
                  {t('footer.terms')}
                </a>
              </li>
              <li>
                <a className="hover:text-white" href="/privacy.html">
                  {t('footer.privacy')}
                </a>
              </li>
              <li>
                <a className="hover:text-white" href="/refund-policy.html">
                  {t('footer.refund')}
                </a>
              </li>
              <li>
                <a className="hover:text-white" href="/support.html">
                  {t('footer.support')}
                </a>
              </li>
              <li>
                <a className="hover:text-white" href="/feedback">
                  {t('footer.feedback')}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-center text-xs text-gray-500 py-4">
          &copy; {new Date().getFullYear()} {PRODUCT.name}. {t('footer.rights')}
        </div>
      </footer>
    </div>
  )
}
export default Layout
