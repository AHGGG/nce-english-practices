import mdict_utils
import inspect
import pkgutil

print(f"Package file: {mdict_utils.__file__}")
print(f"Package dir: {dir(mdict_utils)}")

# Walk through submodules
package = mdict_utils
for importer, modname, ispkg in pkgutil.walk_packages(package.__path__, package.__name__ + "."):
    print(f"Found submodule: {modname}")
