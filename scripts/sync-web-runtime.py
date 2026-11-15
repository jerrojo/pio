"""Copy authored sources to a runtime outside iCloud. Does not copy secrets or dependencies."""
from pathlib import Path
import shutil
source = Path(__file__).resolve().parents[1] / 'web'
destination = Path('/private/tmp/pio-web-runtime')
destination.mkdir(parents=True, exist_ok=True)
ignored = {'node_modules', '.next', '.git'}
for item in source.rglob('*'):
    relative = item.relative_to(source)
    if any(part in ignored for part in relative.parts) or not item.is_file():
        continue
    if item.name.startswith('.env') or item.name.endswith('.tsbuildinfo'):
        continue
    target = destination / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_mtime_ns == item.stat().st_mtime_ns and target.stat().st_size == item.stat().st_size:
        continue
    temporary = target.with_name('.' + target.name + '.pio-sync-tmp')
    shutil.copy2(item, temporary)
    temporary.replace(target)
print(destination)
