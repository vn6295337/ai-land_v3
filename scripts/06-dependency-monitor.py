#!/usr/bin/env python3
"""
Dependency monitoring and alerting script
Tracks dependency changes and security advisories over time.
"""

import sys
import os
import json
import subprocess
import hashlib
from typing import Dict, List, Optional
from pathlib import Path
from datetime import datetime, timedelta


class DependencyMonitor:
    """Monitor dependencies for changes and security issues."""

    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.state_file = self.project_root / '.dependency-state.json'
        self.current_state = {}
        self.previous_state = {}

    def load_previous_state(self) -> Dict:
        """Load previous dependency state from file."""
        if not self.state_file.exists():
            return {}

        try:
            with open(self.state_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: Could not load previous state: {e}")
            return {}

    def save_current_state(self, state: Dict) -> None:
        """Save current dependency state to file."""
        try:
            with open(self.state_file, 'w') as f:
                json.dump(state, f, indent=2, default=str)
        except IOError as e:
            print(f"Warning: Could not save state: {e}")

    def get_package_lock_hash(self) -> Optional[str]:
        """Get hash of package-lock.json for change detection."""
        lock_file = self.project_root / 'package-lock.json'

        if not lock_file.exists():
            return None

        try:
            with open(lock_file, 'rb') as f:
                content = f.read()
                return hashlib.sha256(content).hexdigest()[:16]  # Short hash
        except IOError:
            return None

    def get_installed_packages(self) -> Dict:
        """Get list of currently installed packages with versions."""
        try:
            result = subprocess.run(
                ['npm', 'list', '--json', '--depth=0'],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.stdout:
                data = json.loads(result.stdout)
                dependencies = data.get('dependencies', {})

                # Extract name and version
                packages = {}
                for name, info in dependencies.items():
                    packages[name] = {
                        'version': info.get('version', 'unknown'),
                        'resolved': info.get('resolved'),
                        'dev': info.get('dev', False)
                    }

                return packages

        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, json.JSONDecodeError) as e:
            print(f"Warning: Could not get installed packages: {e}")

        return {}

    def check_outdated_packages(self) -> Dict:
        """Check for outdated packages."""
        try:
            result = subprocess.run(
                ['npm', 'outdated', '--json'],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.stdout:
                return json.loads(result.stdout)

        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, json.JSONDecodeError) as e:
            print(f"Warning: Could not check outdated packages: {e}")

        return {}

    def analyze_dependency_changes(self, current: Dict, previous: Dict) -> Dict:
        """Analyze changes between current and previous dependency states."""
        changes = {
            'added': {},
            'removed': {},
            'updated': {},
            'unchanged': {}
        }

        current_packages = current.get('packages', {})
        previous_packages = previous.get('packages', {})

        # Find added packages
        for name, info in current_packages.items():
            if name not in previous_packages:
                changes['added'][name] = info

        # Find removed packages
        for name, info in previous_packages.items():
            if name not in current_packages:
                changes['removed'][name] = info

        # Find updated packages
        for name, info in current_packages.items():
            if name in previous_packages:
                prev_version = previous_packages[name].get('version')
                curr_version = info.get('version')

                if prev_version != curr_version:
                    changes['updated'][name] = {
                        'from': prev_version,
                        'to': curr_version,
                        'info': info
                    }
                else:
                    changes['unchanged'][name] = info

        return changes

    def assess_security_impact(self, changes: Dict) -> List[Dict]:
        """Assess potential security impact of dependency changes."""
        alerts = []

        # Check added packages
        for name, info in changes.get('added', {}).items():
            alerts.append({
                'type': 'package_added',
                'package': name,
                'version': info.get('version'),
                'severity': 'info',
                'message': f"New dependency added: {name}@{info.get('version')}"
            })

        # Check removed packages
        for name, info in changes.get('removed', {}).items():
            alerts.append({
                'type': 'package_removed',
                'package': name,
                'version': info.get('version'),
                'severity': 'info',
                'message': f"Dependency removed: {name}@{info.get('version')}"
            })

        # Check updated packages
        for name, update_info in changes.get('updated', {}).items():
            from_version = update_info.get('from')
            to_version = update_info.get('to')

            # Check for major version updates (potential breaking changes)
            if self.is_major_version_change(from_version, to_version):
                alerts.append({
                    'type': 'major_update',
                    'package': name,
                    'from_version': from_version,
                    'to_version': to_version,
                    'severity': 'warning',
                    'message': f"Major version update: {name} {from_version} → {to_version}"
                })
            else:
                alerts.append({
                    'type': 'minor_update',
                    'package': name,
                    'from_version': from_version,
                    'to_version': to_version,
                    'severity': 'info',
                    'message': f"Package updated: {name} {from_version} → {to_version}"
                })

        return alerts

    def is_major_version_change(self, from_version: str, to_version: str) -> bool:
        """Check if version change is a major version bump."""
        if not from_version or not to_version:
            return False

        try:
            # Extract major version numbers
            from_major = from_version.split('.')[0].lstrip('v^~')
            to_major = to_version.split('.')[0].lstrip('v^~')

            return from_major != to_major
        except (IndexError, AttributeError):
            return False

    def generate_monitoring_report(self, changes: Dict, alerts: List[Dict], outdated: Dict) -> str:
        """Generate dependency monitoring report."""
        report = []
        report.append("# Dependency Monitoring Report")
        report.append(f"Generated: {datetime.now().isoformat()}")
        report.append(f"Project: {self.project_root.name}")
        report.append("")

        # Summary
        total_changes = len(changes.get('added', {})) + len(changes.get('removed', {})) + len(changes.get('updated', {}))
        report.append("## Summary")
        report.append(f"- Total dependency changes: {total_changes}")
        report.append(f"- Packages added: {len(changes.get('added', {}))}")
        report.append(f"- Packages removed: {len(changes.get('removed', {}))}")
        report.append(f"- Packages updated: {len(changes.get('updated', {}))}")
        report.append(f"- Outdated packages: {len(outdated)}")
        report.append("")

        # Changes detail
        if total_changes > 0:
            report.append("## Dependency Changes")

            if changes.get('added'):
                report.append("### Added Packages")
                for name, info in changes['added'].items():
                    report.append(f"- ➕ {name}@{info.get('version')}")
                report.append("")

            if changes.get('removed'):
                report.append("### Removed Packages")
                for name, info in changes['removed'].items():
                    report.append(f"- ➖ {name}@{info.get('version')}")
                report.append("")

            if changes.get('updated'):
                report.append("### Updated Packages")
                for name, update_info in changes['updated'].items():
                    from_ver = update_info.get('from')
                    to_ver = update_info.get('to')
                    icon = "⬆️" if self.is_major_version_change(from_ver, to_ver) else "📦"
                    report.append(f"- {icon} {name}: {from_ver} → {to_ver}")
                report.append("")

        # Security alerts
        if alerts:
            report.append("## Security Alerts")
            for alert in alerts:
                severity = alert.get('severity', 'info')
                icon = "🚨" if severity == 'error' else "⚠️" if severity == 'warning' else "ℹ️"
                report.append(f"- {icon} {alert.get('message')}")
            report.append("")

        # Outdated packages
        if outdated:
            report.append("## Outdated Packages")
            report.append("Consider updating these packages:")
            for name, info in outdated.items():
                current = info.get('current', 'unknown')
                wanted = info.get('wanted', 'unknown')
                latest = info.get('latest', 'unknown')
                report.append(f"- 📦 {name}: {current} (wanted: {wanted}, latest: {latest})")
            report.append("")

        # Recommendations
        report.append("## Recommendations")
        if total_changes > 0:
            report.append("- Review all dependency changes for potential security implications")
            report.append("- Test thoroughly after dependency updates")
            report.append("- Run vulnerability scans after changes")

        if outdated:
            report.append("- Consider updating outdated packages")
            report.append("- Review changelogs for breaking changes")

        report.append("- Monitor security advisories for all dependencies")
        report.append("- Set up automated dependency update PRs")
        report.append("- Regularly audit and remove unused dependencies")

        return "\n".join(report)

    def monitor_dependencies(self) -> Dict:
        """Run dependency monitoring and return results."""
        print("📦 Monitoring dependency changes...")

        # Load previous state
        self.previous_state = self.load_previous_state()

        # Get current state
        self.current_state = {
            'timestamp': datetime.now().isoformat(),
            'lock_hash': self.get_package_lock_hash(),
            'packages': self.get_installed_packages()
        }

        # Analyze changes
        changes = self.analyze_dependency_changes(self.current_state, self.previous_state)
        alerts = self.assess_security_impact(changes)
        outdated = self.check_outdated_packages()

        # Save current state for next run
        self.save_current_state(self.current_state)

        return {
            'changes': changes,
            'alerts': alerts,
            'outdated': outdated,
            'current_state': self.current_state,
            'previous_state': self.previous_state
        }


def main():
    """Main function to run dependency monitoring."""
    if len(sys.argv) > 1:
        project_root = sys.argv[1]
    else:
        project_root = os.getcwd()

    if not os.path.exists(project_root):
        print(f"Error: Project directory '{project_root}' does not exist")
        sys.exit(1)

    # Check if package.json exists
    package_json = Path(project_root) / 'package.json'
    if not package_json.exists():
        print("Error: No package.json found in project directory")
        sys.exit(1)

    monitor = DependencyMonitor(project_root)
    results = monitor.monitor_dependencies()

    # Generate and display report
    report = monitor.generate_monitoring_report(
        results['changes'],
        results['alerts'],
        results['outdated']
    )

    print("\n" + "="*60)
    print(report)
    print("="*60)

    # Check for critical alerts
    critical_alerts = [a for a in results['alerts'] if a.get('severity') == 'error']
    warning_alerts = [a for a in results['alerts'] if a.get('severity') == 'warning']

    if critical_alerts:
        print(f"\n❌ {len(critical_alerts)} critical security alerts found")
        sys.exit(1)
    elif warning_alerts:
        print(f"\n⚠️  {len(warning_alerts)} warnings found")
    else:
        print(f"\n✅ Dependency monitoring completed successfully")

    sys.exit(0)


if __name__ == "__main__":
    main()