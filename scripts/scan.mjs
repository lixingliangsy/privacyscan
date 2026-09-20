// scan.mjs — privacyscan 通用隐私/GDPR 合规审计（GDPR / SOC2 / ISO27001 域，真实实现）
// 幂等：同输入同输出、无副作用、可重入。返回 { items:[{id,...}], metrics:{...} }
// 注：privacyscan 原脚手架把审计入口放在 lib/auditLog.ts，此处补齐 scripts/scan.mjs 以对接通用 audit-run.mjs 契约。
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA = path.join(ROOT, '.data')
const AUDIT = path.join(DATA, 'audit')

async function fetchText(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 12000)
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 't1-audit-bot/1.0 (+https://lxsai.com)' } })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    return await r.text()
  } finally { clearTimeout(t) }
}

async function loadTargets(targets) {
  const docs = []
  for (const t of targets) {
    try {
      const p = path.isAbsolute(t) ? t : path.join(AUDIT, t)
      docs.push(JSON.parse(fs.readFileSync(p, 'utf8')))
    } catch (e) { console.warn('[scan] target load failed:', t, e.message) }
  }
  return docs
}

export async function scan(ctx) {
  const cfg = JSON.parse(fs.readFileSync(path.join(DATA, 'config.json'), 'utf8'))
  const targets = (cfg.scan && cfg.scan.targets) || ['privacyscan-sample.json']
  const d = (await loadTargets(targets))[0] || {}
  const items = []
  const checks = [
    ['cookie_consent_banner', 'Cookie 同意横幅', 'high', '缺少 Cookie/跟踪同意机制(GDPR Art.6/7)'],
    ['lawful_basis_documented', '合法性基础记录', 'medium', '未记录处理个人数据的合法性基础'],
    ['privacy_policy_present', '隐私政策', 'high', '缺少隐私政策或不可见'],
    ['dpa_with_processors', '与处理方签 DPA', 'medium', '与数据处理方缺少数据处理协议(DPA)'],
    ['data_subject_erasure', '数据主体删除权', 'medium', '未提供被遗忘权/删除请求通道'],
    ['data_minimization', '数据最小化', 'low', '收集超出目的所需的数据'],
    ['international_transfer_scc', '跨境传输保障(SCC)', 'medium', '向第三国传输缺少标准合同条款(SCC)'],
    ['breach_notification_72h', '72 小时泄露通报', 'medium', '缺少 72 小时内向监管通报泄露的机制'],
    ['privacy_contact_dpo', '隐私联系人/DPO', 'low', '缺少隐私联系人或数据保护官(DPO)'],
  ]
  for (const [key, title, severity, detail] of checks) {
    if (d[key] !== true) items.push({ id: 'gdpr:' + key + '-missing', category: 'gdpr', severity, title: title + ' 缺失', detail, present: false })
  }
  const weights = { high: 18, medium: 10, low: 5 }
  const bySeverity = { high: 0, medium: 0, low: 0 }
  let penalty = 0
  for (const it of items) { penalty += weights[it.severity] || 0; bySeverity[it.severity]++ }
  const score = Math.max(0, 100 - penalty)
  const metrics = { gdpr_score: score, total_checks: checks.length, passed: checks.length - items.length, by_severity: bySeverity }
  return { items, metrics }
}
