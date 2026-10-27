// Логотип в версии под текущую тему: какую картинку показать, решает CSS (.logo-light/.logo-dark/.logo-coffee)
const VARIANTS = ['light', 'dark', 'coffee'];

export default function Logo({ kind = 'emblem', className = '', alt = 'ÆNGLISC HORD' }) {
  return VARIANTS.map((theme) => (
    <img
      key={theme}
      src={`/logo/${theme}-${kind}.png`}
      alt={theme === 'light' ? alt : ''}
      aria-hidden={theme === 'light' ? undefined : true}
      draggable={false}
      className={`logo-${theme} ${className}`}
    />
  ));
}
