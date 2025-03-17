# bash script
# for each zip file in .. that starts with "mutants-" and ends with ".zip, unzip it in the current directory

for f in ../mutants-*.zip; do
    unzip $f
done
